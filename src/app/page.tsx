"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Loader2, CalendarIcon, Settings2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

type PaymentMethod = "CASH" | "CREDIT_CARD" | "PROMPTPAY" | "GOWABI" | "ALIPAY";

interface ServiceItem { id: string; name: string; category: string; price: number; durationMinutes: number; order: number; }
interface CartItem { service: ServiceItem; quantity: number; }
interface Employee { id: string; name: string; role: string; }

function SwapableServiceCard({ svc, inCart, isEditingLayout, isSelectedForSwap, onClick }: { svc: ServiceItem, inCart: any, isEditingLayout: boolean, isSelectedForSwap: boolean, onClick: () => void }) {
    let cardStyle = "";
    if (isEditingLayout) {
        if (isSelectedForSwap) {
            cardStyle = "border-orange-500 bg-orange-50 shadow-md ring-4 ring-orange-500/20 scale-[1.02] z-10";
        } else {
            cardStyle = "border-gray-300 border-dashed hover:border-orange-300 hover:bg-orange-50/50 opacity-80 hover:opacity-100";
        }
    } else {
        if (inCart) {
            cardStyle = "border-rose-400 bg-rose-50 shadow-inner";
        } else {
            cardStyle = "border-rose-100 hover:border-rose-200 hover:shadow-md";
        }
    }

    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 h-28 flex flex-col justify-between relative bg-white select-none cursor-pointer ${cardStyle}`}
        >
            {isSelectedForSwap && (
                <div className="absolute -top-3 -right-3 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md animate-pulse border-2 border-white z-20">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                </div>
            )}
            <div>
                <div className={`font-semibold text-[13px] leading-snug line-clamp-2 ${isEditingLayout ? 'text-gray-600' : 'text-gray-800'}`}>{svc.name}</div>
            </div>
            <div className="flex items-end justify-between w-full mt-2">
                <span className={`text-[15px] font-bold ${isEditingLayout && !isSelectedForSwap ? 'text-gray-400' : 'text-rose-600'}`}>{svc.price} THB</span>
                {!isEditingLayout && inCart && <Badge className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] px-1.5 rounded-md min-w-[20px] text-center">{inCart.quantity}</Badge>}
            </div>
        </div>
    );
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    CASH: "Cash", CREDIT_CARD: "Card", PROMPTPAY: "QR Code", GOWABI: "Gowabi", ALIPAY: "Alipay"
};

const CATEGORIES: Record<string, { label: string }> = {
    NAILS: { label: "Nails" },
    EYELASH: { label: "Eyelash" },
    PERMANENT_MAKEUP: { label: "Permanent Makeup" },
    COURSE_STUDY: { label: "Course Study" }
};

export default function RecordsPage() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [employeeName, setEmployeeName] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [filterCategory, setFilterCategory] = useState<string>("NAILS");
    const [processing, setProcessing] = useState(false);
    const [isEditingLayout, setIsEditingLayout] = useState(false);
    const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);

    const toggleEditLayout = () => {
        setIsEditingLayout(!isEditingLayout);
        setSelectedForSwap(null);
    };

    const handleSwapClick = (id: string) => {
        if (!selectedForSwap) {
            setSelectedForSwap(id);
        } else if (selectedForSwap === id) {
            setSelectedForSwap(null);
        } else {
            setServices((prev) => {
                const newArray = [...prev];
                const idx1 = newArray.findIndex(s => s.id === selectedForSwap);
                const idx2 = newArray.findIndex(s => s.id === id);
                if (idx1 !== -1 && idx2 !== -1) {
                    const temp = newArray[idx1];
                    newArray[idx1] = newArray[idx2];
                    newArray[idx2] = temp;
                    fetch('/api/services/reorder', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newArray.map((item, index) => ({ id: item.id, order: index }))),
                    }).catch(() => toast.error('เกิดข้อผิดพลาดในการบันทึกการจัดเรียง'));
                }
                return newArray;
            });
            setSelectedForSwap(null);
        }
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [svcRes, empRes] = await Promise.all([fetch("/api/services"), fetch("/api/employees")]);
            setServices(await svcRes.json());
            setEmployees(await empRes.json());
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const addToCart = (svc: ServiceItem) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.service.id === svc.id);
            if (existing) return prev.map((c) => c.service.id === svc.id ? { ...c, quantity: c.quantity + 1 } : c);
            return [...prev, { service: svc, quantity: 1 }];
        });
    };

    const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.service.id !== id));
    const cartTotal = cart.reduce((sum, c) => sum + c.service.price * c.quantity, 0);

    const handleCheckout = async () => {
        if (!employeeName) { toast.error("Please select an employee"); return; }
        if (cart.length === 0) { toast.error("Please select at least one service"); return; }

        let txDateIso = new Date().toISOString();
        if (transactionDate) {
            const d = new Date(transactionDate);
            if (!isNaN(d.getTime())) txDateIso = d.toISOString();
        }

        setProcessing(true);
        try {
            const body = {
                customerName: "-",
                employeeName,
                paymentMethod,
                totalAmount: cartTotal,
                description: cart.map((c) => c.service.name).join(", "),
                date: txDateIso,
                items: cart.map((c) => ({ serviceId: c.service.id, quantity: c.quantity, price: Number(c.service.price) })),
            };
            const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            toast.success(`Payment successful ฿${cartTotal.toLocaleString()} — ${PAYMENT_LABELS[paymentMethod]}`);
            setCart([]); setEmployeeName(""); setPaymentMethod("CASH"); setTransactionDate(format(new Date(), "yyyy-MM-dd"));
            fetchAll();
        } catch { toast.error("Failed to save transaction"); }
        finally { setProcessing(false); }
    };

    const filteredSvcs = services.filter((s) => s.category === filterCategory);

    return (
        <div className="p-4 lg:p-6 space-y-6 pb-28 lg:pb-6 relative w-full mx-auto">
            <div className="space-y-6">
                {/* Employee Selection */}
                <div className="flex justify-center">
                    <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                        {employees.map(emp => (
                            <button
                                key={emp.id}
                                onClick={() => setEmployeeName(emp.name)}
                                className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${employeeName === emp.name
                                    ? "bg-rose-500 text-white shadow-md"
                                    : "bg-rose-50 text-rose-500 hover:bg-rose-100"
                                    }`}
                            >
                                {emp.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Row */}
                <Card className="border border-gray-100 shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-4 pt-6 grid grid-cols-1 gap-6 bg-white">
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-semibold mb-1">Transaction Date</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={transactionDate}
                                    onChange={(e) => setTransactionDate(e.target.value)}
                                    className="pl-3 pr-10 border-gray-200 h-12 rounded-lg w-full text-gray-600 focus-visible:ring-rose-200"
                                />
                                <CalendarIcon className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Service Category */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <Label className="text-gray-700 font-medium mb-3 block">Service Category</Label>
                    <div className="flex flex-wrap gap-3">
                        {Object.keys(CATEGORIES).map(catKey => (
                            <button
                                key={catKey}
                                onClick={() => setFilterCategory(catKey)}
                                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${filterCategory === catKey
                                    ? "bg-rose-500 text-white"
                                    : "bg-rose-50 text-rose-500 hover:bg-rose-100"
                                    }`}
                            >
                                {CATEGORIES[catKey].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <Label className="text-gray-700 font-medium block">Select Services</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`rounded-lg transition-all h-8 px-3 text-xs ${isEditingLayout ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:text-orange-700' : 'text-gray-500'}`}
                            onClick={toggleEditLayout}
                        >
                            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                            {isEditingLayout ? "เรียบร้อย" : "จัดเรียงบริการ"}
                        </Button>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {filteredSvcs.map((svc) => (
                                <SwapableServiceCard
                                    key={svc.id}
                                    svc={svc}
                                    inCart={cart.find((c) => c.service.id === svc.id)}
                                    isEditingLayout={isEditingLayout}
                                    isSelectedForSwap={selectedForSwap === svc.id}
                                    onClick={() => {
                                        if (isEditingLayout) {
                                            handleSwapClick(svc.id);
                                        } else {
                                            addToCart(svc);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Services / Cart */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 min-h-[140px]">
                    <Label className="text-gray-700 font-medium mb-4 block">Selected Services</Label>
                    {cart.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 mt-2 rounded-xl p-8 flex items-center justify-center text-gray-400 text-sm">
                            <p>No services selected</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div key={item.service.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-gray-800">{item.service.name}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[15px] font-bold text-gray-900">{item.service.price * item.quantity} THB</p>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">x {item.quantity}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.service.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payment Method */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <Label className="text-gray-700 font-medium mb-4 block">Payment Method</Label>
                    <div className="flex flex-wrap gap-3">
                        {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map(methodKey => (
                            <button
                                key={methodKey}
                                onClick={() => setPaymentMethod(methodKey)}
                                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${paymentMethod === methodKey
                                    ? "border-2 border-rose-400 bg-rose-50 text-rose-600"
                                    : "border-2 border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    }`}
                            >
                                {PAYMENT_LABELS[methodKey]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Total & Checkout */}
                <div className="space-y-4 pt-4 pb-8">
                    <div className="bg-rose-500 rounded-xl p-8 text-center shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <p className="text-white/90 text-[15px] font-semibold mb-2">Total Amount</p>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-white text-5xl font-bold tracking-tight">{cartTotal}</span>
                            <span className="text-white/90 text-2xl font-bold tracking-tight">THB</span>
                        </div>
                    </div>
                    <Button
                        onClick={handleCheckout}
                        disabled={processing}
                        className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-8 text-xl font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                    >
                        {processing ? (
                            <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Saving...</>
                        ) : (
                            "Confirm Payment"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
