"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Check } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";

export function EmployeeFilter({
  selectedEmployees = [],
  onEmployeeChange = () => {},
  onEmployeesChange, // Accept both prop names for compatibility
  showAllOption = true,
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use onEmployeesChange if provided, otherwise use onEmployeeChange
  const handleChange = onEmployeesChange || onEmployeeChange;

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const usersData = usersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((u) => u.role === "cashier" || u.role === "admin");
      setEmployees(usersData);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const isAllSelected =
    selectedEmployees.length === 0 ||
    selectedEmployees.length === employees.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      // If all selected, do nothing (keep all selected)
      handleChange([]);
    } else {
      // Select all
      handleChange([]);
    }
  };

  const handleSelectEmployee = (employeeId) => {
    if (selectedEmployees.length === 0) {
      // Currently "All" is selected, switch to single employee
      handleChange([employeeId]);
    } else if (selectedEmployees.includes(employeeId)) {
      // Deselect this employee
      const newSelection = selectedEmployees.filter((id) => id !== employeeId);
      // If none selected, go back to "All"
      handleChange(newSelection.length === 0 ? [] : newSelection);
    } else {
      // Add this employee
      handleChange([...selectedEmployees, employeeId]);
    }
  };

  const getDisplayLabel = () => {
    if (isAllSelected) {
      return "All employees";
    }
    if (selectedEmployees.length === 1) {
      const emp = employees.find((e) => e.id === selectedEmployees[0]);
      return emp?.name || emp?.displayName || emp?.email || "1 employee";
    }
    return `${selectedEmployees.length} employees`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="h-4 w-4" />
          {getDisplayLabel()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-2 max-h-80 overflow-y-auto"
      >
        {loading ? (
          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {showAllOption && (
              <div
                className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-muted rounded-md ${
                  isAllSelected ? "bg-green-100 dark:bg-green-900/30" : ""
                }`}
                onClick={handleSelectAll}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    isAllSelected
                      ? "bg-green-600 border-green-600"
                      : "border-neutral-400 dark:border-neutral-600"
                  }`}
                >
                  {isAllSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-sm font-medium">All employees</span>
              </div>
            )}
            <div className="my-2 border-t" />
            {employees.map((employee) => {
              const isChecked =
                isAllSelected || selectedEmployees.includes(employee.id);
              return (
                <div
                  key={employee.id}
                  className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-muted rounded-md ${
                    selectedEmployees.includes(employee.id) && !isAllSelected
                      ? "bg-green-100 dark:bg-green-900/30"
                      : ""
                  }`}
                  onClick={() => handleSelectEmployee(employee.id)}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isChecked
                        ? "bg-green-600 border-green-600"
                        : "border-neutral-400 dark:border-neutral-600"
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm">
                    {employee.name || employee.displayName || employee.email}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
