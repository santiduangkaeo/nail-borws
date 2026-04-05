"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Scissors, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ServiceCategory = "NAILS" | "EYELASH" | "PERMANENT_MAKEUP" | "COURSE_STUDY";

interface ServiceItem {
    id: string;
    name: string;
    category: ServiceCategory;
    price: number;
    durationMinutes: number;
    isActive: boolean;
    order: number;
}

const CATEGORIES: Record<ServiceCategory, { label: string; color: string }> = {
    NAILS: { label: "เล็บ", color: "bg-pink-100 text-pink-700 border-pink-200" },
    EYELASH: { label: "ขนตา", color: "bg-purple-100 text-purple-700 border-purple-200" },
    PERMANENT_MAKEUP: { label: "สักปาก/คิ้ว", color: "bg-amber-100 text-amber-700 border-amber-200" },
    COURSE_STUDY: { label: "คอร์สเรียน", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const emptyForm = { name: "", category: "NAILS" as ServiceCategory, price: "", durationMinutes: "" };

function ServiceCard({ svc, onEdit, onDelete }: { svc: ServiceItem, onEdit: () => void, onDelete: () => void }) {
    return (
        <div className="group p-5 rounded-2xl border transition-all relative select-none bg-white border-gray-100 hover:border-rose-200 hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
                <Badge className={`${CATEGORIES[svc.category].color} px-2 py-0.5 rounded-lg border`}>
                    {CATEGORIES[svc.category].label}
                </Badge>
                <div className="flex gap-1">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <h4 className="font-bold text-gray-800 text-base mb-3 leading-snug">{svc.name}</h4>
            <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-rose-500">฿{Number(svc.price).toLocaleString()}</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg">
                    <Clock className="h-3.5 w-3.5" />
                    {svc.durationMinutes} นาที
                </span>
            </div>
        </div>
    );
}

export function ServicesTab() {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceItem | null>(null);
    const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (categoryFilter !== "ALL") params.set("category", categoryFilter);
            const res = await fetch(`/api/services?${params}`);
            const data = await res.json();
            setServices(data);
        } catch {
            toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const openAdd = () => {
        setEditingService(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (svc: ServiceItem) => {
        setEditingService(svc);
        setForm({ name: svc.name, category: svc.category, price: String(svc.price), durationMinutes: String(svc.durationMinutes) });
        setDialogOpen(true);
    };

    const openDelete = (svc: ServiceItem) => {
        setDeletingService(svc);
        setDeleteDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.price || !form.durationMinutes) {
            toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }
        setSaving(true);
        try {
            const body = { name: form.name.trim(), category: form.category, price: Number(form.price), durationMinutes: Number(form.durationMinutes) };
            const res = editingService
                ? await fetch(`/api/services/${editingService.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
                : await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            toast.success(editingService ? "แก้ไขบริการสำเร็จ" : "เพิ่มบริการสำเร็จ");
            setDialogOpen(false);
            fetchServices();
        } catch {
            toast.error("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingService) return;
        try {
            await fetch(`/api/services/${deletingService.id}`, { method: "DELETE" });
            toast.success("ลบบริการสำเร็จ");
            setDeleteDialogOpen(false);
            fetchServices();
        } catch {
            toast.error("ลบไม่สำเร็จ");
        }
    };

    const filtered = services.filter((s) => {
        const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === "ALL" || s.category === categoryFilter;
        return matchSearch && matchCat;
    });

    return (
        <Card className="border border-gray-100 shadow-xl shadow-gray-200/40 rounded-3xl overflow-hidden bg-white/60 backdrop-blur-md">
            <CardHeader className="border-b border-gray-100/50 bg-white/80 pb-6 pt-8 px-8 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-bold text-gray-800">รายการบริการ</CardTitle>
                    <CardDescription className="text-gray-500 font-medium mt-1">จัดการบริการต่างๆ รวมถึงการเรียงลำดับการ์ดบริการ</CardDescription>
                </div>
                <div className="flex gap-3 items-center">
                    <Button onClick={openAdd} className="bg-rose-500 hover:bg-rose-600 text-white gap-2 rounded-xl shadow-md h-10 px-5">
                        <Plus className="h-4 w-4" />
                        เพิ่มบริการ
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-8 px-8 bg-white/40 pb-8">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="ค้นหาบริการ..."
                            className="pl-9 h-12 rounded-xl bg-white border-gray-200 focus:border-rose-400 focus:ring-rose-100"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full sm:w-48 h-12 rounded-xl bg-white border-gray-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">หมวดหมู่ทั้งหมด</SelectItem>
                            <SelectItem value="NAILS">💅 เล็บ</SelectItem>
                            <SelectItem value="EYELASH">👁️ ขนตา</SelectItem>
                            <SelectItem value="PERMANENT_MAKEUP">💄 สักปาก/คิ้ว</SelectItem>
                            <SelectItem value="COURSE_STUDY">📚 คอร์สเรียน</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Services List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 rounded-xl bg-gray-100/50 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 border-dashed">
                        <Scissors className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-base font-semibold text-gray-600">ไม่พบบริการ</p>
                        <p className="text-sm text-gray-400 mt-1">ลองเปลี่ยนคำค้นหาหรือเพิ่มบริการใหม่</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((svc) => (
                            <ServiceCard
                                key={svc.id}
                                svc={svc}
                                onEdit={() => openEdit(svc)}
                                onDelete={() => openDelete(svc)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{editingService ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">ชื่อบริการ</Label>
                            <Input placeholder="เช่น ทาเล็บเจล" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-12 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold text-gray-700">หมวดหมู่</Label>
                            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ServiceCategory }))}>
                                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NAILS">💅 เล็บ</SelectItem>
                                    <SelectItem value="EYELASH">👁️ ขนตา</SelectItem>
                                    <SelectItem value="PERMANENT_MAKEUP">💄 สักปาก/คิ้ว</SelectItem>
                                    <SelectItem value="COURSE_STUDY">📚 คอร์สเรียน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">ราคา (บาท)</Label>
                                <Input type="number" placeholder="350" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="h-12 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold text-gray-700">ระยะเวลา (นาที)</Label>
                                <Input type="number" placeholder="45" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} className="h-12 rounded-xl" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="rounded-xl h-12 px-6">ยกเลิก</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 px-6 shadow-md">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingService ? "บันทึกการแก้ไข" : "บันทึก")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">ยืนยันการลบ</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-4">
                        คุณต้องการลบบริการ <span className="font-semibold text-rose-600">"{deletingService?.name}"</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                    </p>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl flex-1">ยกเลิก</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl flex-1">ลบบริการ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
