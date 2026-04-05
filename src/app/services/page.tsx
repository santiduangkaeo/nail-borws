"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Scissors, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const CATEGORIES: Record<ServiceCategory, { label: string; color: string }> = {
    NAILS: { label: "เล็บ", color: "bg-pink-100 text-pink-700 border-pink-200" },
    EYELASH: { label: "ขนตา", color: "bg-purple-100 text-purple-700 border-purple-200" },
    PERMANENT_MAKEUP: { label: "สักปาก/คิ้ว", color: "bg-amber-100 text-amber-700 border-amber-200" },
    COURSE_STUDY: { label: "คอร์สเรียน", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

const emptyForm = { name: "", category: "NAILS" as ServiceCategory, price: "", durationMinutes: "" };

export default function ServicesPage() {
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

    const stats = {
        total: services.length,
        nails: services.filter((s) => s.category === "NAILS").length,
        eyelash: services.filter((s) => s.category === "EYELASH").length,
        permanentMakeup: services.filter((s) => s.category === "PERMANENT_MAKEUP").length,
        courseStudy: services.filter((s) => s.category === "COURSE_STUDY").length,
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">รายการบริการ</h1>
                    <p className="text-sm text-gray-500 mt-0.5">จัดการบริการทั้งหมดของร้าน</p>
                </div>
                <Button onClick={openAdd} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    เพิ่มบริการ
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "ทั้งหมด", value: stats.total, icon: "🗂️" },
                    { label: "เล็บ", value: stats.nails, icon: "💅" },
                    { label: "ขนตา", value: stats.eyelash, icon: "👁️" },
                    { label: "สักปาก/คิ้ว", value: stats.permanentMakeup, icon: "💄" },
                    { label: "คอร์สเรียน", value: stats.courseStudy, icon: "📚" },
                ].map((s) => (
                    <Card key={s.label} className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-3">
                            <span className="text-3xl">{s.icon}</span>
                            <div>
                                <p className="text-sm text-gray-500">{s.label}</p>
                                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="ค้นหาบริการ..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-40">
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

            {/* Services Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">ไม่พบบริการ</p>
                    <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหาหรือเพิ่มบริการใหม่</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((svc) => (
                        <Card key={svc.id} className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge className={`text-xs font-medium border ${CATEGORIES[svc.category].color}`} variant="outline">
                                        {CATEGORIES[svc.category].label}
                                    </Badge>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(svc)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => openDelete(svc)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-gray-900 text-base leading-snug mb-3">{svc.name}</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-rose-600">฿{Number(svc.price).toLocaleString()}</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                        <Clock className="h-3 w-3" />
                                        {svc.durationMinutes} นาที
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingService ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>ชื่อบริการ</Label>
                            <Input placeholder="เช่น ทาเล็บเจล" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <Label>หมวดหมู่</Label>
                            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ServiceCategory }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NAILS">💅 เล็บ</SelectItem>
                                    <SelectItem value="EYELASH">👁️ ขนตา</SelectItem>
                                    <SelectItem value="PERMANENT_MAKEUP">💄 สักปาก/คิ้ว</SelectItem>
                                    <SelectItem value="COURSE_STUDY">📚 คอร์สเรียน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>ราคา (บาท)</Label>
                                <Input type="number" placeholder="350" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>ระยะเวลา (นาที)</Label>
                                <Input type="number" placeholder="45" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>ยกเลิก</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white">
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบ</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 py-2">
                        คุณต้องการลบบริการ <span className="font-semibold text-gray-900">"{deletingService?.name}"</span> ใช่หรือไม่?
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
                        <Button variant="destructive" onClick={handleDelete}>ลบบริการ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
