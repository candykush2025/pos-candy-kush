"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Database } from "lucide-react";
import { expensesService } from "@/lib/firebase/firestore";

export default function FixExpensesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fixExpenses = async () => {
    try {
      setLoading(true);
      setResult(null);
      
      toast.info("Fetching expenses...");
      
      // Get all expenses
      const expenses = await expensesService.getAll();
      
      console.log("📊 Found expenses:", expenses);
      
      let updated = 0;
      let skipped = 0;
      const errors = [];
      
      for (const expense of expenses) {
        try {
          // Check if expense needs migration
          const needsMigration = 
            expense.status === undefined ||
            expense.category === undefined ||
            expense.employeeId === undefined;
          
          if (needsMigration) {
            console.log(`🔧 Fixing expense: ${expense.id}`);
            
            const updates = {};
            
            // Add missing fields with defaults
            if (expense.status === undefined) {
              updates.status = "pending";
            }
            
            if (expense.category === undefined) {
              updates.category = "General";
            }
            
            if (expense.employeeId === undefined) {
              updates.employeeId = null;
            }
            
            if (expense.employeeName === undefined) {
              updates.employeeName = "Unknown";
            }
            
            if (expense.approvedBy === undefined) {
              updates.approvedBy = null;
            }
            
            if (expense.approvedByName === undefined) {
              updates.approvedByName = null;
            }
            
            if (expense.approvedAt === undefined) {
              updates.approvedAt = null;
            }
            
            if (expense.approvalNotes === undefined) {
              updates.approvalNotes = null;
            }
            
            // Update the expense
            await expensesService.update(expense.id, updates);
            
            console.log(`✅ Fixed: ${expense.id}`, updates);
            updated++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`❌ Error fixing expense ${expense.id}:`, error);
          errors.push({ id: expense.id, error: error.message });
        }
      }
      
      const resultMsg = {
        total: expenses.length,
        updated,
        skipped,
        errors: errors.length,
        errorDetails: errors
      };
      
      setResult(resultMsg);
      
      if (errors.length === 0) {
        toast.success(`Fixed ${updated} expenses! ${skipped} were already correct.`);
      } else {
        toast.warning(`Fixed ${updated} expenses, but ${errors.length} had errors.`);
      }
      
    } catch (error) {
      console.error("❌ Migration failed:", error);
      toast.error("Failed to fix expenses: " + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Fix Old Expense Records
          </CardTitle>
          <CardDescription>
            This tool will update old expense records that are missing the new approval workflow fields.
            Run this once to fix existing data in Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What this does:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Adds <code>status: "pending"</code> to expenses without status</li>
              <li>Adds <code>category: "General"</code> to expenses without category</li>
              <li>Adds <code>employeeId: null</code> to expenses without employee</li>
              <li>Adds <code>employeeName: "Unknown"</code> to expenses without name</li>
              <li>Adds approval fields (approvedBy, approvedByName, approvedAt, approvalNotes) as null</li>
            </ul>
          </div>

          <Button 
            onClick={fixExpenses} 
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Fixing Expenses...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Fix Expenses Now
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <h3 className="font-semibold mb-3">Results:</h3>
              <div className="space-y-2 text-sm">
                <p>✅ Total expenses found: <strong>{result.total}</strong></p>
                <p>🔧 Updated: <strong>{result.updated}</strong></p>
                <p>⏭️ Skipped (already correct): <strong>{result.skipped}</strong></p>
                <p>❌ Errors: <strong>{result.errors}</strong></p>
                
                {result.errorDetails && result.errorDetails.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-2">
                      Error Details:
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                      {result.errorDetails.map((err, idx) => (
                        <div key={idx} className="text-xs mb-2">
                          <span className="font-mono">{err.id}</span>: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {result.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="font-semibold text-red-600 dark:text-red-400">Error:</p>
                    <p className="text-xs mt-1">{result.error}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Note:</strong> You only need to run this once. After fixing, go to Admin → Expenses to see your updated data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
