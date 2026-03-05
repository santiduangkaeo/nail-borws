"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { th } from "date-fns/locale";
import { Clock, Loader2, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaymentMethodSummary {
    amount: number;
    count: number;
    label: string;
}

interface ServiceItem {
    id: string;
    name: string;
    price: number;
}

interface TransactionItem {
    id: string;
    quantity: number;
    price: number;
    service: ServiceItem;
}

interface Transaction {
    id: string;
    employeeName: string;
    customerName: string;
    totalAmount: number;
    paymentMethod: string;
    date: string;
    items: TransactionItem[];
}

interface EmployeeStat {
    employeeName: string;
    transactionCount: number;
    totalAmount: number;
    paymentMethods: Record<string, PaymentMethodSummary>;
    transactions: Transaction[];
}

export default function StaffLogsPage() {
    const [range, setRange] = useState<"today" | "weekly" | "monthly" | "date">("today");
    const [dateParam, setDateParam] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
    const [data, setData] = useState<EmployeeStat[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [editTx, setEditTx] = useState<Transaction | null>(null);
    const [editMethod, setEditMethod] = useState<string>("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setIsDeleting(true);
            const res = await fetch(`/api/transactions/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("Transaction deleted successfully", { className: "bg-green-50 text-green-800 border border-green-200" });
            setDeleteId(null);
            fetchData();
        } catch (error) {
            toast.error("Failed to delete transaction", { className: "bg-red-50 text-red-800 border border-red-200" });
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmEdit = async () => {
        if (!editTx || !editMethod) return;
        try {
            setIsSavingEdit(true);
            const res = await fetch(`/api/transactions/${editTx.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: editMethod,
                    totalAmount: Number(editTx.totalAmount)
                })
            });
            if (!res.ok) throw new Error("Failed");
            toast.success("Transaction updated successfully", { className: "bg-green-50 text-green-800 border border-green-200" });
            setEditTx(null);
            fetchData();
        } catch (error) {
            toast.error("Failed to update transaction", { className: "bg-red-50 text-red-800 border border-red-200" });
        } finally {
            setIsSavingEdit(false);
        }
    };

    const openEditPrompt = (tx: Transaction) => {
        setEditTx(tx);
        setEditMethod(tx.paymentMethod);
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("range", range);
            if (dateParam) {
                params.set("date", dateParam);
            }
            const res = await fetch(`/api/staff-logs?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            setData(json);
        } catch (error) {
            toast.error("Failed to load staff performance data");
        } finally {
            setLoading(false);
        }
    }, [range, dateParam]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLoadReport = () => {
        fetchData();
    };

    const employeeNames = Array.from(new Set(data.map((d) => d.employeeName)));
    const filteredData = selectedEmployee === "ALL" ? data : data.filter((d) => d.employeeName === selectedEmployee);

    // --- Compute Summary Table Data ---
    const columns = ["CASH", "CREDIT_CARD", "PROMPTPAY", "GOWABI", "ALIPAY"] as const;
    const paymentTotals = { CASH: 0, CREDIT_CARD: 0, PROMPTPAY: 0, GOWABI: 0, ALIPAY: 0 };
    let grandTotal = 0;

    const summaryRows = filteredData.map(stat => {
        let staffTotal = 0;
        const methods = {} as Record<string, number>;
        columns.forEach(col => {
            const amount = stat.paymentMethods[col]?.amount || 0;
            methods[col] = amount;
            paymentTotals[col] += amount;
            staffTotal += amount;
        });
        grandTotal += staffTotal;
        return { employeeName: stat.employeeName, methods, staffTotal };
    });
    // --- End Compute ---

    return (
        <div className="p-4 md:p-6 w-full mx-auto space-y-6">
            {/* Header / Date Toggles */}
            <div className="flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-xl border border-rose-100">
                    <Button
                        variant={range === "today" ? "default" : "ghost"}
                        onClick={() => setRange("today")}
                        className={cn("rounded-lg", range === "today" ? "bg-rose-500 text-white hover:bg-rose-600" : "text-rose-700 hover:bg-rose-100")}
                    >
                        Today
                    </Button>
                    <Button
                        variant={range === "weekly" ? "default" : "ghost"}
                        onClick={() => setRange("weekly")}
                        className={cn("rounded-lg", range === "weekly" ? "bg-rose-500 text-white hover:bg-rose-600" : "text-rose-700 hover:bg-rose-100")}
                    >
                        Weekly
                    </Button>
                    <Button
                        variant={range === "monthly" ? "default" : "ghost"}
                        onClick={() => setRange("monthly")}
                        className={cn("rounded-lg", range === "monthly" ? "bg-rose-500 text-white hover:bg-rose-600" : "text-rose-700 hover:bg-rose-100")}
                    >
                        Monthly
                    </Button>
                </div>

                <div className="w-full max-w-3xl bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Label className="text-xs text-gray-500 mb-1 block">
                                {range === "monthly" ? "Select Month" : range === "weekly" ? "Select Week" : "Select Date"} (Optional)
                            </Label>
                            <div className="relative">
                                {range === "weekly" ? (
                                    <Select
                                        value={(() => {
                                            const target = dateParam ? new Date(dateParam) : new Date();
                                            const start = startOfWeek(target, { weekStartsOn: 0 });
                                            return format(start, "yyyy-MM-dd");
                                        })()}
                                        onValueChange={(val) => setDateParam(val)}
                                    >
                                        <SelectTrigger className="w-full h-11 bg-gray-50/50 border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                                <SelectValue placeholder="Select Week" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(() => {
                                                const now = new Date();
                                                const startOfThisYear = new Date(now.getFullYear(), 0, 1);
                                                const week1Start = startOfWeek(startOfThisYear, { weekStartsOn: 0 });
                                                const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });

                                                const weeks: Date[] = [];
                                                let temp = currentWeekStart;
                                                while (temp >= week1Start) {
                                                    weeks.push(new Date(temp));
                                                    temp = subWeeks(temp, 1);
                                                }

                                                return weeks.map((weekDate) => {
                                                    const start = startOfWeek(weekDate, { weekStartsOn: 0 });
                                                    const end = endOfWeek(weekDate, { weekStartsOn: 0 });
                                                    const dateKey = format(start, "yyyy-MM-dd");
                                                    return (
                                                        <SelectItem key={dateKey} value={dateKey}>
                                                            Week {format(weekDate, "w")} ({format(start, "dd/MM")} - {format(end, "dd/MM")})
                                                        </SelectItem>
                                                    );
                                                });
                                            })()}
                                        </SelectContent>
                                    </Select>
                                ) : range === "monthly" ? (
                                    <div className="flex gap-2">
                                        <Select
                                            value={dateParam ? new Date(dateParam).getMonth().toString() : new Date().getMonth().toString()}
                                            onValueChange={(val) => {
                                                const parts = dateParam ? dateParam.split("-") : [new Date().getFullYear().toString(), "01", "01"];
                                                setDateParam(`${parts[0]}-${(parseInt(val) + 1).toString().padStart(2, '0')}-01`);
                                            }}
                                        >
                                            <SelectTrigger className="w-full h-11 bg-gray-50/50 border-gray-200">
                                                <div className="flex items-center gap-2">
                                                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                                                    <SelectValue placeholder="Month" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 12 }).map((_, i) => (
                                                    <SelectItem key={i} value={i.toString()}>
                                                        {format(new Date(2026, i, 1), "MMMM")}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={dateParam ? new Date(dateParam).getFullYear().toString() : new Date().getFullYear().toString()}
                                            onValueChange={(val) => {
                                                const parts = dateParam ? dateParam.split("-") : [new Date().getFullYear().toString(), "01", "01"];
                                                setDateParam(`${val}-${parts[1]}-01`);
                                            }}
                                        >
                                            <SelectTrigger className="w-[120px] h-11 bg-gray-50/50 border-gray-200">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Array.from({ length: 5 }).map((_, i) => {
                                                    const y = new Date().getFullYear() - 2 + i;
                                                    return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <>
                                        <Input
                                            type="date"
                                            value={dateParam}
                                            onChange={(e) => {
                                                setDateParam(e.target.value);
                                                if (range === "today" && e.target.value) setRange("date");
                                            }}
                                            className="w-full pl-10 h-11 bg-gray-50/50 border-gray-200"
                                        />
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <Label className="text-xs text-gray-500 mb-1 block">Select Employee</Label>
                            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                                <SelectTrigger className="w-full h-11 bg-gray-50/50 border-gray-200">
                                    <SelectValue placeholder="All Employees" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Employees</SelectItem>
                                    {employeeNames.map(name => (
                                        <SelectItem key={name} value={name}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        onClick={handleLoadReport}
                        disabled={loading}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white h-11"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        Load Report Data
                    </Button>
                </div>
            </div>

            {/* Displaying Current Filter */}
            <div className="text-center font-bold text-rose-800 tracking-tight text-lg mt-2 mb-4 bg-rose-50 border border-rose-100 py-2 rounded-xl">
                Sales Summary — {range === "today" ? format(new Date(), "dd/MM/yyyy") :
                    range === "weekly" ? (() => {
                        const target = dateParam ? new Date(dateParam) : new Date();
                        const start = startOfWeek(target, { weekStartsOn: 0 });
                        const end = endOfWeek(target, { weekStartsOn: 0 });
                        return `Week ${format(target, "w")} (${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")})`;
                    })() :
                        range === "monthly" ? (() => {
                            const target = dateParam ? new Date(dateParam) : new Date();
                            return `Month: ${format(target, "MMMM yyyy")}`;
                        })() :
                            format(new Date(dateParam), "dd/MM/yyyy")}
            </div>

            {/* Summary Table */}
            {!loading && filteredData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-md border border-rose-100 overflow-hidden mb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-center">
                            <thead className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Staff</th>
                                    <th className="px-4 py-3 font-semibold">Cash</th>
                                    <th className="px-4 py-3 font-semibold">Card</th>
                                    <th className="px-4 py-3 font-semibold">QR</th>
                                    <th className="px-4 py-3 font-semibold">Gowabi</th>
                                    <th className="px-4 py-3 font-semibold">Alipay</th>
                                    <th className="px-4 py-3 font-bold text-right">Staff Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaryRows.map((row, idx) => (
                                    <tr key={row.employeeName} className={idx % 2 === 0 ? "bg-rose-50/40" : "bg-white"}>
                                        <td className="px-4 py-3 text-left font-semibold text-rose-800 border-b border-rose-50">{row.employeeName}</td>
                                        {columns.map(col => (
                                            <td key={col} className="px-4 py-3 text-gray-600 border-b border-rose-50 border-l border-rose-50">{row.methods[col] > 0 ? row.methods[col].toLocaleString() : <span className="text-gray-300">–</span>}</td>
                                        ))}
                                        <td className="px-4 py-3 text-right font-bold text-rose-700 border-b border-rose-50 border-l border-rose-50">{row.staffTotal.toLocaleString()}</td>
                                    </tr>
                                ))}
                                <tr className="bg-rose-100/60 font-bold border-t-2 border-rose-200">
                                    <td className="px-4 py-4 text-left text-rose-900">Payment Totals</td>
                                    {columns.map(col => (
                                        <td key={`total-${col}`} className="px-4 py-4 text-rose-800 border-l border-rose-100">{paymentTotals[col] > 0 ? paymentTotals[col].toLocaleString() : <span className="text-gray-300">–</span>}</td>
                                    ))}
                                    <td className="px-4 py-4 text-right font-extrabold text-rose-900 border-l border-rose-100">{grandTotal.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 text-center space-y-1">
                        <p className="text-rose-100 text-sm font-medium tracking-widest uppercase">Grand Total</p>
                        <p className="text-5xl font-extrabold tracking-tight">{grandTotal.toLocaleString()}</p>
                        <p className="text-rose-200 text-xs">THB</p>
                    </div>
                </div>
            )}

            {/* Staff Cards */}
            {loading && data.length === 0 ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
            ) : filteredData.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No performance data found for the selected time or employee.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredData.map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-rose-100">
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-rose-500 to-pink-500 p-4 text-white">
                                <h3 className="text-xl font-bold">{stat.employeeName}</h3>
                                <p className="text-rose-100 text-sm opacity-90">Transaction Count: {stat.transactionCount}</p>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 md:p-5 space-y-5">
                                {/* Payment Methods Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    {(["CASH", "CREDIT_CARD", "PROMPTPAY", "GOWABI", "ALIPAY"] as const).map((method) => {
                                        const summary = stat.paymentMethods[method] || { amount: 0, count: 0, label: method };
                                        const displayLabel = method === "PROMPTPAY" ? "QR Code" : method === "CREDIT_CARD" ? "Card" : method === "CASH" ? "Cash" : method === "GOWABI" ? "Gowabi" : "Alipay";
                                        return (
                                            <div key={method} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                                                <p className="text-xs text-gray-500 font-medium mb-1">{displayLabel}</p>
                                                <p className={cn("text-base font-bold", summary.amount > 0 ? "text-rose-700" : "text-gray-400")}>
                                                    {summary.amount > 0 ? `${summary.amount.toLocaleString()} THB` : "-"}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1">({summary.count} items)</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Staff Total */}
                                <div className="bg-rose-50/50 rounded-xl p-4 flex items-center justify-between border border-rose-100">
                                    <span className="font-bold text-rose-900 border-b-2 border-transparent">Staff Total:</span>
                                    <span className="text-2xl font-black text-rose-600">{stat.totalAmount.toLocaleString()} THB</span>
                                </div>

                                {/* Daily Breakdown Section */}
                                <div className="pt-2">
                                    <h4 className="font-bold text-rose-800 text-sm mb-3">Daily Breakdown</h4>

                                    <div className="bg-rose-50/50 text-rose-800 p-2.5 rounded-lg font-semibold text-sm mb-3 border border-rose-100">
                                        {range === "today" ? format(new Date(), "dd/MM/yyyy") :
                                            range === "weekly" ? (() => {
                                                const target = dateParam ? new Date(dateParam) : new Date();
                                                const start = startOfWeek(target, { weekStartsOn: 0 });
                                                const end = endOfWeek(target, { weekStartsOn: 0 });
                                                return `Week ${format(target, "w")} (${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")})`;
                                            })() :
                                                range === "monthly" ? (() => {
                                                    const target = dateParam ? new Date(dateParam) : new Date();
                                                    return `Month: ${format(target, "MMMM yyyy")}`;
                                                })() :
                                                    range === "date" ? format(new Date(dateParam), "dd/MM/yyyy") : "All transactions"}
                                    </div>

                                    {["CASH", "CREDIT_CARD", "PROMPTPAY", "GOWABI", "ALIPAY"].map((method) => {
                                        const txForMethod = stat.transactions.filter(tx => tx.paymentMethod === method);
                                        if (txForMethod.length === 0) return null;

                                        const displayLabel = method === "PROMPTPAY" ? "QR Code" : method === "CREDIT_CARD" ? "Card" : method === "CASH" ? "Cash" : method === "GOWABI" ? "Gowabi" : "Alipay";

                                        return (
                                            <div key={method} className="mb-4 last:mb-0 border border-gray-200 rounded-xl overflow-hidden bg-white">
                                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                                    <span className="font-bold text-gray-800 text-sm">{displayLabel}</span>
                                                </div>

                                                <div className="divide-y divide-gray-100">
                                                    {txForMethod.map((tx) => (
                                                        <div key={tx.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div className="flex items-center gap-1.5 text-red-600 font-bold text-sm">
                                                                    {new Date(tx.date).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-black text-gray-800">{Number(tx.totalAmount).toLocaleString()} THB</span>
                                                                    <div className="flex gap-1">
                                                                        <button onClick={() => openEditPrompt(tx)} className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-600 cursor-pointer text-[10px] font-bold rounded">Edit</button>
                                                                        <button onClick={() => setDeleteId(tx.id)} disabled={isDeleting && deleteId === tx.id} className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-600 cursor-pointer text-[10px] font-bold rounded disabled:opacity-50">Delete</button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="pl-6 space-y-2">
                                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                                                    <FileText className="h-3.5 w-3.5 text-amber-500" />
                                                                    Services:
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {tx.items.map((item) => (
                                                                        <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-gray-800">{item.service.name}</span>
                                                                                <span className="text-gray-400 text-xs">x{item.quantity}</span>
                                                                            </div>
                                                                            <span className="text-rose-600 font-semibold text-xs">{(Number(item.price) * item.quantity).toLocaleString()} THB</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Delete Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Transaction</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this transaction? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editTx} onOpenChange={(open) => !open && setEditTx(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Payment Method</DialogTitle>
                        <DialogDescription>
                            Select a new payment method for this transaction.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4 text-sm text-gray-700">
                        <div className="space-y-1.5">
                            <Label>Payment Method</Label>
                            <Select value={editMethod} onValueChange={setEditMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                                <SelectContent>
                                    {["CASH", "CREDIT_CARD", "PROMPTPAY", "GOWABI", "ALIPAY"].map((m) => (
                                        <SelectItem key={m} value={m}>{
                                            m === "PROMPTPAY" ? "QR Code" :
                                                m === "CREDIT_CARD" ? "Card" :
                                                    m === "CASH" ? "Cash" :
                                                        m === "GOWABI" ? "Gowabi" : "Alipay"
                                        }</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Total Amount (THB)</Label>
                            <Input
                                type="number"
                                value={editTx?.totalAmount || 0}
                                onChange={(e) => {
                                    if (editTx) {
                                        setEditTx({ ...editTx, totalAmount: Number(e.target.value) });
                                    }
                                }}
                                className="border-gray-300"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditTx(null)} disabled={isSavingEdit}>Cancel</Button>
                        <Button onClick={confirmEdit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSavingEdit}>
                            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
