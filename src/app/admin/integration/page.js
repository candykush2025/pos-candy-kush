"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Link2,
  RefreshCw,
  Database,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Users,
  ShoppingCart,
  FolderTree,
} from "lucide-react";
import { toast } from "sonner";
import { loyverseService } from "@/lib/api/loyverse";
import { setDocument, COLLECTIONS } from "@/lib/firebase/firestore";

export default function IntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState({
    categories: false,
    items: false,
    customers: false,
    receipts: false,
    paymentTypes: false,
  });

  const [syncResults, setSyncResults] = useState({
    categories: null,
    items: null,
    customers: null,
    receipts: null,
    paymentTypes: null,
  });

  const [debugData, setDebugData] = useState(null);
  const [showDebugData, setShowDebugData] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState(null);

  // Test API Connection
  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const response = await loyverseService.getCategories({ limit: 1 });
      toast.success("✅ Connection successful!");
      console.log("Loyverse API Test Response:", response);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error(`❌ Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Sync Categories
  const handleSyncCategories = async () => {
    setSyncing({ ...syncing, categories: true });
    try {
      // Fetch all categories from Loyverse
      const response = await loyverseService.getAllCategories({
        show_deleted: false,
      });

      console.log("Loyverse Categories:", response);

      // Transform to our format
      const categories = response.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || "#808080",
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
        deletedAt: cat.deleted_at,
        source: "loyverse",
      }));

      // Save to Firebase Firestore ONLY (categories collection)
      // Admin saves to Firebase, POS syncs from Firebase to IndexedDB
      console.log(`📤 Saving ${categories.length} categories to Firebase...`);
      const firebaseSavePromises = categories.map((category) =>
        setDocument(COLLECTIONS.CATEGORIES, category.id, category)
      );
      await Promise.all(firebaseSavePromises);
      console.log(`✅ Saved ${categories.length} categories to Firebase`);

      setSyncResults({
        ...syncResults,
        categories: {
          success: true,
          count: categories.length,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(`✅ Synced ${categories.length} categories to Firebase`);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Category sync failed:", error);
      toast.error(`❌ Sync failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        categories: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, categories: false });
    }
  };

  // Sync Items (Products)
  const handleSyncItems = async () => {
    setSyncing({ ...syncing, items: true });
    try {
      const response = await loyverseService.getAllItems({
        show_deleted: false,
      });

      console.log("Loyverse Items:", response);

      // Transform to our format (matching Loyverse Items API)
      const items = response.items.map((item) => {
        // Get the first variant (most items have at least one)
        const primaryVariant = item.variants?.[0] || {};

        return {
          // Item basic info
          id: item.id,
          handle: item.handle || "",
          name: item.item_name || "",
          description: item.description || "",
          referenceId: item.reference_id || "",

          // Category and tracking
          categoryId: item.category_id || null,
          trackStock: item.track_stock || false,
          soldByWeight: item.sold_by_weight || false,
          isComposite: item.is_composite || false,
          useProduction: item.use_production || false,

          // Visual and organization
          form: item.form || null,
          color: item.color || null,
          imageUrl: item.image_url || null,

          // Options
          option1Name: item.option1_name || null,
          option2Name: item.option2_name || null,
          option3Name: item.option3_name || null,

          // Primary variant data (for quick access)
          variantId: primaryVariant.variant_id || null,
          sku: primaryVariant.sku || "",
          barcode: primaryVariant.barcode || "",
          price: parseFloat(primaryVariant.default_price || 0),
          cost: parseFloat(primaryVariant.cost || 0),
          purchaseCost: parseFloat(primaryVariant.purchase_cost || 0),
          pricingType: primaryVariant.default_pricing_type || "FIXED",

          // Stock info (from first store if available)
          stock: primaryVariant.stores?.[0]?.stock_quantity || 0,
          availableForSale:
            primaryVariant.stores?.[0]?.available_for_sale !== false,

          // All variants data (for multi-variant items)
          variants: item.variants || [],

          // IDs references
          primarySupplierId: item.primary_supplier_id || null,
          taxIds: item.tax_ids || [],
          modifiersIds: item.modifiers_ids || [],
          components: item.components || [],

          // Timestamps
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          deletedAt: item.deleted_at || null,

          // Source tracking
          source: "loyverse",
        };
      });

      // Save to Firebase Firestore ONLY (items collection)
      // Admin saves to Firebase, POS syncs from Firebase to IndexedDB
      console.log(`📤 Saving ${items.length} items to Firebase...`);
      const firebaseSavePromises = items.map((item) =>
        setDocument(COLLECTIONS.PRODUCTS, item.id, item)
      );
      await Promise.all(firebaseSavePromises);
      console.log(`✅ Saved ${items.length} items to Firebase`);

      setSyncResults({
        ...syncResults,
        items: {
          success: true,
          count: items.length,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(`✅ Synced ${items.length} items to Firebase`);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Items sync failed:", error);
      toast.error(`❌ Sync failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        items: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, items: false });
    }
  };

  // Sync Customers
  const handleSyncCustomers = async () => {
    setSyncing({ ...syncing, customers: true });
    try {
      const response = await loyverseService.getAllCustomers();

      console.log("Loyverse Customers:", response);

      // Transform to our format (matching Loyverse API response structure)
      const customers = response.customers.map((cust) => ({
        id: cust.id,
        name: cust.name || "",
        customerCode: cust.customer_code || "",
        email: cust.email || "",
        phone: cust.phone_number || "",
        address: cust.address || "",
        city: cust.city || "",
        province: cust.region || "",
        postalCode: cust.postal_code || "",
        countryCode: cust.country_code || "",
        note: cust.note || "",
        // Visit and spending data
        firstVisit: cust.first_visit || null,
        lastVisit: cust.last_visit || null,
        totalVisits: parseInt(cust.total_visits || 0),
        totalSpent: parseFloat(cust.total_spent || 0),
        totalPoints: parseFloat(cust.total_points || 0),
        // Timestamps
        createdAt: cust.created_at,
        updatedAt: cust.updated_at,
        deletedAt: cust.deleted_at || null,
        permanentDeletionAt: cust.permanent_deletion_at || null,
        // Source tracking
        source: "loyverse",
      }));

      // Save to Firebase Firestore ONLY (customers collection)
      // Admin saves to Firebase, POS syncs from Firebase to IndexedDB
      console.log(`📤 Saving ${customers.length} customers to Firebase...`);
      const firebaseSavePromises = customers.map((customer) =>
        setDocument(COLLECTIONS.CUSTOMERS, customer.id, customer)
      );
      await Promise.all(firebaseSavePromises);
      console.log(`✅ Saved ${customers.length} customers to Firebase`);

      setSyncResults({
        ...syncResults,
        customers: {
          success: true,
          count: customers.length,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(`✅ Synced ${customers.length} customers to Firebase`);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Customers sync failed:", error);
      toast.error(`❌ Sync failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        customers: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, customers: false });
    }
  };

  // Sync Receipts (Orders)
  const handleSyncReceipts = async () => {
    setSyncing({ ...syncing, receipts: true });
    try {
      // Fetch receipts with progress tracking
      const response = await loyverseService.getAllReceipts({
        onProgress: (current, total) => {
          const progress = Math.round((current / total) * 100);
          toast.info(`Fetching receipts: ${progress}% (${current}/${total})`, {
            id: "receipts-progress",
            duration: Infinity,
          });
        },
      });

      toast.dismiss("receipts-progress");
      console.log("Loyverse Receipts:", response);

      // Transform and save receipts to Firebase
      const receipts = response.receipts.map((receipt) => ({
        // Receipt identification
        receiptNumber: receipt.receipt_number,
        receiptType: receipt.receipt_type,
        refundFor: receipt.refund_for || null,
        order: receipt.order || null,

        // Dates
        createdAt: receipt.created_at,
        receiptDate: receipt.receipt_date,
        updatedAt: receipt.updated_at,
        cancelledAt: receipt.cancelled_at || null,

        // Source and location
        source: receipt.source || "loyverse",
        storeId: receipt.store_id,
        posDeviceId: receipt.pos_device_id || null,
        diningOption: receipt.dining_option || null,

        // Totals
        totalMoney: parseFloat(receipt.total_money || 0),
        totalTax: parseFloat(receipt.total_tax || 0),
        totalDiscount: parseFloat(receipt.total_discount || 0),
        tip: parseFloat(receipt.tip || 0),
        surcharge: parseFloat(receipt.surcharge || 0),

        // Customer and employee
        customerId: receipt.customer_id || null,
        employeeId: receipt.employee_id || null,

        // Points
        pointsEarned: parseFloat(receipt.points_earned || 0),
        pointsDeducted: parseFloat(receipt.points_deducted || 0),
        pointsBalance: parseFloat(receipt.points_balance || 0),

        // Details
        note: receipt.note || null,
        lineItems: receipt.line_items || [],
        payments: receipt.payments || [],
        totalDiscounts: receipt.total_discounts || [],
        totalTaxes: receipt.total_taxes || [],

        // Metadata
        syncedAt: new Date().toISOString(),
      }));

      // Save to Firebase Firestore (receipts collection)
      console.log(`📤 Saving ${receipts.length} receipts to Firebase...`);
      const firebaseSavePromises = receipts.map((receipt) =>
        setDocument(COLLECTIONS.RECEIPTS, receipt.receiptNumber, receipt)
      );
      await Promise.all(firebaseSavePromises);
      console.log(`✅ Saved ${receipts.length} receipts to Firebase`);

      setSyncResults({
        ...syncResults,
        receipts: {
          success: true,
          count: receipts.length,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(`✅ Synced ${receipts.length} receipts to Firebase`);
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Receipts sync failed:", error);
      toast.error(`❌ Sync failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        receipts: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, receipts: false });
    }
  };

  // Get Payment Types
  const handleGetPaymentTypes = async () => {
    setSyncing({ ...syncing, paymentTypes: true });
    try {
      console.log("📡 Fetching payment types from Loyverse...");
      const response = await loyverseService.getAllPaymentTypes({
        show_deleted: false,
      });

      console.log("Loyverse Payment Types:", response);
      setPaymentTypes(response.payment_types);

      setSyncResults({
        ...syncResults,
        paymentTypes: {
          success: true,
          count: response.payment_types?.length || 0,
          timestamp: new Date().toISOString(),
        },
      });

      toast.success(
        `✅ Found ${response.payment_types?.length || 0} payment types`
      );
      setDebugData(response);
      setShowDebugData(true);
    } catch (error) {
      console.error("Payment types fetch failed:", error);
      toast.error(`❌ Failed: ${error.message}`);
      setSyncResults({
        ...syncResults,
        paymentTypes: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setSyncing({ ...syncing, paymentTypes: false });
    }
  };

  // Sync All
  const handleSyncAll = async () => {
    toast.info("Starting full sync...");
    await handleSyncCategories();
    await handleSyncItems();
    await handleSyncCustomers();
    await handleSyncReceipts();
    toast.success("🎉 Full sync completed!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8 text-primary" />
          Loyverse Integration
        </h1>
        <p className="text-gray-500 mt-2">
          Sync data from Loyverse POS to your local database
        </p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              API Connection
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Ready
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">API Endpoint:</p>
              <p className="font-mono text-xs">https://api.loyverse.com/v1.0</p>
            </div>
            <div>
              <p className="text-gray-500">Access Token:</p>
              <p className="font-mono text-xs">d390d2...c2b8 ✅</p>
            </div>
          </div>
          <Button
            onClick={handleTestConnection}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Test Connection
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderTree className="h-5 w-5 text-purple-600" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncResults.categories && (
              <div
                className={`p-3 rounded-lg ${
                  syncResults.categories.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {syncResults.categories.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.categories.success
                      ? `${syncResults.categories.count} synced`
                      : "Sync failed"}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  {new Date(syncResults.categories.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={handleSyncCategories}
              disabled={syncing.categories}
              className="w-full"
              variant="outline"
            >
              {syncing.categories ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Categories
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-blue-600" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncResults.items && (
              <div
                className={`p-3 rounded-lg ${
                  syncResults.items.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {syncResults.items.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.items.success
                      ? `${syncResults.items.count} synced`
                      : "Sync failed"}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  {new Date(syncResults.items.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={handleSyncItems}
              disabled={syncing.items}
              className="w-full"
              variant="outline"
            >
              {syncing.items ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Items
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-green-600" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncResults.customers && (
              <div
                className={`p-3 rounded-lg ${
                  syncResults.customers.success
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {syncResults.customers.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.customers.success
                      ? `${syncResults.customers.count} synced`
                      : "Sync failed"}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  {new Date(syncResults.customers.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={handleSyncCustomers}
              disabled={syncing.customers}
              className="w-full"
              variant="outline"
            >
              {syncing.customers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Customers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Receipts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Receipts (Orders)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncResults.receipts && (
              <div
                className={`p-3 rounded-lg ${
                  syncResults.receipts.success
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {syncResults.receipts.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {syncResults.receipts.success
                      ? `${syncResults.receipts.count} synced`
                      : "Sync failed"}
                  </span>
                </div>
                <p className="text-xs mt-1">
                  {new Date(syncResults.receipts.timestamp).toLocaleString()}
                </p>
              </div>
            )}
            <Button
              onClick={handleSyncReceipts}
              disabled={syncing.receipts}
              className="w-full"
              variant="outline"
            >
              {syncing.receipts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Sync Receipts
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payment Types Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Payment Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            View all available payment types configured in your Loyverse
            account. This helps you identify the correct Payment Type IDs for
            receipts.
          </p>

          {syncResults.paymentTypes && (
            <div
              className={`p-3 rounded-lg ${
                syncResults.paymentTypes.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                {syncResults.paymentTypes.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {syncResults.paymentTypes.success
                    ? `${syncResults.paymentTypes.count} payment types found`
                    : "Fetch failed"}
                </span>
              </div>
              <p className="text-xs mt-1">
                {new Date(syncResults.paymentTypes.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          <Button
            onClick={handleGetPaymentTypes}
            disabled={syncing.paymentTypes}
            className="w-full"
            variant="outline"
          >
            {syncing.paymentTypes ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Get Payment Types
              </>
            )}
          </Button>

          {/* Display Payment Types */}
          {paymentTypes && paymentTypes.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Available Payment Types ({paymentTypes.length}):
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {paymentTypes.map((pt) => (
                  <div
                    key={pt.id}
                    className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {pt.name}
                          </h4>
                          <Badge
                            variant={
                              pt.type === "CASH"
                                ? "default"
                                : pt.type === "CARD"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {pt.type}
                          </Badge>
                          {pt.deleted_at && (
                            <Badge variant="destructive" className="text-xs">
                              Deleted
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                            ID: {pt.id}
                          </p>
                          {pt.stores && pt.stores.length > 0 && (
                            <p>Stores: {pt.stores.length} configured</p>
                          )}
                          <p>
                            Created:{" "}
                            {new Date(pt.created_at).toLocaleDateString()}
                          </p>
                          {pt.updated_at && (
                            <p>
                              Updated:{" "}
                              {new Date(pt.updated_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync All */}
      <Card>
        <CardHeader>
          <CardTitle>Full Synchronization</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSyncAll}
            disabled={Object.values(syncing).some((s) => s)}
            className="w-full"
            size="lg"
          >
            {Object.values(syncing).some((s) => s) ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Debug Data */}
      {showDebugData && debugData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Debug Data</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebugData(false)}
              >
                Hide
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96 text-xs">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Test Connection" to verify API access</li>
            <li>Sync individual data types or use "Sync All Data"</li>
            <li>Data will be saved to local IndexedDB</li>
            <li>Check browser console for detailed logs</li>
            <li>View debug data to inspect API responses</li>
          </ol>
          <Separator className="my-4" />
          <div className="text-xs text-gray-500">
            <p>
              <strong>Note:</strong> This is a one-way sync from Loyverse to
              your local database. Changes made in your POS will not sync back
              to Loyverse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
