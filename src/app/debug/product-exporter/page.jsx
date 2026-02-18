"use client";

import { useState, useEffect } from "react";
import { productsService, categoriesService } from "@/lib/firebase/firestore";
import {
  Download,
  FileJson,
  Loader2,
  Package,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";

export default function ProductExporterPage() {
  // Only allow in non-production
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Product Exporter (disabled)</h1>
        <p className="mt-2 text-sm text-gray-600">
          This debug page is disabled in production.
        </p>
      </div>
    );
  }

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [exportData, setExportData] = useState(null);
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);

  // ---------- Fetch data from Firebase ----------
  const fetchData = async () => {
    setLoading(true);
    setProgress("Fetching categories...");
    setValidationIssues([]);

    try {
      // 1) Fetch all categories
      const rawCategories = await categoriesService.getAll();
      setProgress(
        `Fetched ${rawCategories.length} categories. Fetching products...`,
      );

      // 2) Fetch all products
      const rawProducts = await productsService.getAll();
      setProgress(`Fetched ${rawProducts.length} products. Processing...`);

      setCategories(rawCategories);
      setProducts(rawProducts);

      // 3) Build tidy export
      buildExport(rawCategories, rawProducts);
    } catch (err) {
      console.error("Fetch error:", err);
      setProgress("❌ Error fetching data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- Build a clean, tidy export ----------
  const buildExport = (rawCategories, rawProducts) => {
    const issues = [];

    // ---- Build category map (id -> category) ----
    const categoryMap = new Map();
    const categoryNameMap = new Map(); // name -> id (fallback lookup)

    const tidyCategories = rawCategories.map((cat) => {
      const id = cat._firestoreId || cat.id;
      const tidyCat = {
        id: id,
        name: cat.name || "",
        color: cat.color || "#6b7280",
        source: cat.source || "local",
        createdAt: cat.createdAt || null,
        updatedAt: cat.updatedAt || null,
      };
      categoryMap.set(id, tidyCat);
      if (tidyCat.name) {
        categoryNameMap.set(tidyCat.name.toLowerCase(), id);
      }
      return tidyCat;
    });

    // Sort categories by name for tidiness
    tidyCategories.sort((a, b) => a.name.localeCompare(b.name));

    // ---- Build tidy products with verified categoryId ----
    const tidyProducts = rawProducts.map((prod) => {
      const productId = prod._firestoreId || prod.id;

      // Resolve the category ID
      let resolvedCategoryId =
        prod.categoryId || prod.category_id || prod.category || null;
      let resolvedCategoryName = prod.categoryName || prod.category_name || "";

      // Verify the categoryId actually exists
      let categoryValid = false;

      if (resolvedCategoryId && categoryMap.has(resolvedCategoryId)) {
        // Direct match by ID — perfect
        categoryValid = true;
        resolvedCategoryName =
          resolvedCategoryName || categoryMap.get(resolvedCategoryId).name;
      } else if (resolvedCategoryId) {
        // ID doesn't match any category. Try to find by name fallback.
        const fallbackId = categoryNameMap.get(
          (resolvedCategoryName || resolvedCategoryId).toLowerCase(),
        );
        if (fallbackId) {
          issues.push({
            type: "warning",
            product: prod.name,
            message: `Category ID "${resolvedCategoryId}" not found. Remapped to "${fallbackId}" via name "${resolvedCategoryName || resolvedCategoryId}".`,
          });
          resolvedCategoryId = fallbackId;
          resolvedCategoryName = categoryMap.get(fallbackId).name;
          categoryValid = true;
        } else {
          issues.push({
            type: "error",
            product: prod.name,
            message: `Category ID "${resolvedCategoryId}" not found in categories list and could not be resolved.`,
          });
        }
      } else {
        // No category at all
        issues.push({
          type: "warning",
          product: prod.name,
          message: "No category assigned.",
        });
      }

      return {
        id: productId,
        name: prod.name || "",
        description: prod.description || "",
        sku: prod.sku || "",
        barcode: prod.barcode || "",
        categoryId: resolvedCategoryId || null,
        categoryName: resolvedCategoryName || "",
        price:
          typeof prod.price === "number"
            ? prod.price
            : parseFloat(prod.price) || 0,
        cost:
          typeof prod.cost === "number"
            ? prod.cost
            : parseFloat(prod.cost) || 0,
        stock:
          typeof prod.stock === "number"
            ? prod.stock
            : parseInt(prod.stock) || 0,
        trackStock: prod.trackStock ?? true,
        lowStockAlert: prod.lowStockAlert || prod.lowStockThreshold || 0,
        unit: prod.unit || "piece",
        isAvailable: prod.isAvailable ?? prod.isActive ?? true,
        imageUrl: prod.imageUrl || prod.image || null,
        color: prod.color || null,
        source: prod.source || "local",
        createdAt: prod.createdAt || null,
        updatedAt: prod.updatedAt || null,
      };
    });

    // Sort products by category then name for tidiness
    tidyProducts.sort((a, b) => {
      const catCompare = (a.categoryName || "").localeCompare(
        b.categoryName || "",
      );
      if (catCompare !== 0) return catCompare;
      return (a.name || "").localeCompare(b.name || "");
    });

    // ---- Build final export object ----
    const data = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        totalCategories: tidyCategories.length,
        totalProducts: tidyProducts.length,
        description:
          "Candy Kush POS — Categories & Products Export. Products reference categories by 'categoryId' which matches the 'id' field in the categories array.",
      },
      categories: tidyCategories,
      products: tidyProducts,
    };

    setExportData(data);
    setValidationIssues(issues);

    // Stats
    const categoriesWithProducts = new Set(
      tidyProducts.filter((p) => p.categoryId).map((p) => p.categoryId),
    );
    const uncategorizedCount = tidyProducts.filter((p) => !p.categoryId).length;

    setStats({
      categories: tidyCategories.length,
      products: tidyProducts.length,
      categoriesWithProducts: categoriesWithProducts.size,
      emptyCategories: tidyCategories.length - categoriesWithProducts.size,
      uncategorizedProducts: uncategorizedCount,
      issues: issues.length,
    });

    setProgress("✅ Export ready!");
    setTimeout(() => setProgress(""), 3000);
  };

  // ---------- Download JSON ----------
  const downloadJSON = () => {
    if (!exportData) return;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candy-kush-products-export_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---------- Copy to clipboard ----------
  const copyToClipboard = async () => {
    if (!exportData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileJson className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Product Exporter
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Export categories &amp; products to a tidy JSON file with
                  verified category–product relationships.
                </p>
              </div>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading ? "Loading..." : "Fetch & Build Export"}
            </button>
          </div>

          {progress && (
            <div className="mt-4 text-sm text-blue-600 bg-blue-50 rounded-lg px-4 py-2">
              {progress}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<FolderOpen className="h-5 w-5 text-purple-600" />}
              label="Categories"
              value={stats.categories}
              bg="bg-purple-50"
            />
            <StatCard
              icon={<Package className="h-5 w-5 text-green-600" />}
              label="Products"
              value={stats.products}
              bg="bg-green-50"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}
              label="Categories w/ Products"
              value={stats.categoriesWithProducts}
              bg="bg-blue-50"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
              label="Issues"
              value={stats.issues}
              bg="bg-amber-50"
            />
          </div>
        )}

        {/* Validation Issues */}
        {validationIssues.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Validation Issues ({validationIssues.length})
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {validationIssues.map((issue, i) => (
                <div
                  key={i}
                  className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
                    issue.type === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {issue.type === "error" ? (
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <span>
                    <strong>{issue.product}:</strong> {issue.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export Actions */}
        {exportData && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Export Actions
            </h2>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadJSON}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </button>

              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showPreview ? "Hide Preview" : "Show Preview"}
              </button>
            </div>
          </div>
        )}

        {/* Category Summary Table */}
        {exportData && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-purple-500" />
              Categories ({exportData.categories.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Color
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      ID
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Name
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">
                      Products
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.categories.map((cat) => {
                    const productCount = exportData.products.filter(
                      (p) => p.categoryId === cat.id,
                    ).length;
                    return (
                      <tr
                        key={cat.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div
                            className="w-5 h-5 rounded-full border"
                            style={{ backgroundColor: cat.color }}
                          />
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500">
                          {cat.id}
                        </td>
                        <td className="py-2 px-3 font-medium">{cat.name}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {productCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Summary Table */}
        {exportData && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              Products ({exportData.products.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      SKU
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">
                      Category
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">
                      Price
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">
                      Stock
                    </th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exportData.products.map((prod) => (
                    <tr
                      key={prod.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-2 px-3 font-medium max-w-[200px] truncate">
                        {prod.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-500">
                        {prod.sku || "—"}
                      </td>
                      <td className="py-2 px-3">
                        {prod.categoryId ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            {prod.categoryName || prod.categoryId}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            uncategorized
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {prod.price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {prod.stock}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {prod.isAvailable ? (
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                        ) : (
                          <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* JSON Preview */}
        {exportData && showPreview && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              JSON Preview
            </h2>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[600px] text-xs leading-relaxed">
              {JSON.stringify(exportData, null, 2)}
            </pre>
          </div>
        )}

        {/* Empty State */}
        {!exportData && !loading && (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <FileJson className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">
              No export generated yet
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              Click <strong>"Fetch &amp; Build Export"</strong> to load
              categories and products from Firebase and generate a tidy JSON
              export.
            </p>
          </div>
        )}

        {/* Export Format Documentation */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            📄 Export Format
          </h2>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              The exported JSON contains <strong>one file</strong> with two
              sections:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">
                  🗂 categories[]
                </h3>
                <ul className="text-xs space-y-1 text-purple-700">
                  <li>
                    <code>id</code> — Unique category identifier
                  </li>
                  <li>
                    <code>name</code> — Display name
                  </li>
                  <li>
                    <code>color</code> — Hex color code
                  </li>
                  <li>
                    <code>source</code> — Origin (local / loyverse)
                  </li>
                  <li>
                    <code>createdAt</code> / <code>updatedAt</code>
                  </li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  📦 products[]
                </h3>
                <ul className="text-xs space-y-1 text-green-700">
                  <li>
                    <code>id</code> — Unique product identifier
                  </li>
                  <li>
                    <code>categoryId</code> — References{" "}
                    <code>categories[].id</code>
                  </li>
                  <li>
                    <code>categoryName</code> — Category display name
                  </li>
                  <li>
                    <code>name</code>, <code>sku</code>, <code>barcode</code>
                  </li>
                  <li>
                    <code>price</code>, <code>cost</code>, <code>stock</code>
                  </li>
                  <li>
                    <code>trackStock</code>, <code>lowStockAlert</code>,{" "}
                    <code>unit</code>
                  </li>
                  <li>
                    <code>isAvailable</code>, <code>imageUrl</code>,{" "}
                    <code>color</code>
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ <strong>Important:</strong> Every product's{" "}
              <code>categoryId</code> is verified to match an existing category{" "}
              <code>id</code>. Mismatches are automatically resolved by name
              when possible, or flagged as validation issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Stat card component ----------
function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-600">{label}</p>
      </div>
    </div>
  );
}
