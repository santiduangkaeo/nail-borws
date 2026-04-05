"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Calendar, Clock, Phone, User, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

type AppointmentStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface ServiceItem { id: string; name: string; category: string; price: number; }
interface Appointment {
    id: string;
    customerName: string;
    phone?: string;
    service: ServiceItem;
    date: string;
    time: string;
    status: AppointmentStatus;
    notes?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle className="h-3 w-3" /> },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
};

const emptyForm = { customerName: "", phone: "", serviceId: "", date: "", time: "10:00", status: "PENDING" as AppointmentStatus, notes: "" };

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [apptRes, svcRes] = await Promise.all([fetch("/api/appointments"), fetch("/api/services")]);
            setAppointments(await apptRes.json());
            setServices(await svcRes.json());
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openAdd = () => { setEditingAppt(null); setForm({ ...emptyForm, date: format(new Date(), "yyyy-MM-dd") }); setDialogOpen(true); };
    const openEdit = (a: Appointment) => {
        setEditingAppt(a);
        setForm({ customerName: a.customerName, phone: a.phone || "", serviceId: a.service.id, date: a.date.slice(0, 10), time: a.time, status: a.status, notes: a.notes || "" });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.customerName || !form.serviceId || !form.date || !form.time) { toast.error("Please fill in all required fields"); return; }
        setSaving(true);
        try {
            const body = { ...form, date: new Date(form.date).toISOString() };
            const res = editingAppt
                ? await fetch(`/api/appointments/${editingAppt.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
                : await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            toast.success(editingAppt ? "Appointment updated" : "Appointment added");
            setDialogOpen(false); fetchAll();
        } catch { toast.error("Failed to save appointment"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this appointment?")) return;
        await fetch(`/api/appointments/${id}`, { method: "DELETE" });
        toast.success("Appointment deleted"); fetchAll();
    };

    const filtered = appointments.filter((a) => {
        const matchSearch = a.customerName.includes(search) || a.service.name.includes(search);
        const matchStatus = a.status === "PENDING";
        return matchSearch && matchStatus;
    });

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayAppts = appointments.filter((a) => a.date?.slice(0, 10) === todayStr).length;
    const pendingAppts = appointments.filter((a) => a.status === "PENDING").length;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage customer appointments</p>
                </div>
                <Button onClick={openAdd} className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
                    <Plus className="h-4 w-4" /> Add Appointment
                </Button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "All", value: appointments.length, icon: "📅" },
                    { label: "Today", value: todayAppts, icon: "🗓️" },
                    { label: "Pending", value: pendingAppts, icon: "⏳" },
                    { label: "Completed", value: appointments.filter(a => a.status === "COMPLETED").length, icon: "✅" },
                ].map((s) => (
                    <Card key={s.label} className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 flex items-center gap-3">
                            <span className="text-3xl">{s.icon}</span>
                            <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-3xl font-bold">{s.value}</p></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Search customer, service..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">No appointments found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((appt) => {
                        const cfg = STATUS_CONFIG[appt.status];
                        const dateStr = appt.date ? format(new Date(appt.date), "d MMM yyyy", { locale: th }) : "-";
                        return (
                            <Card key={appt.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-all bg-white">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                                            <User className="h-5 w-5 text-rose-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900">{appt.customerName}</span>
                                                <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>{cfg.icon}{cfg.label}</Badge>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">{appt.service.name} · ฿{appt.service.price.toLocaleString()}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{dateStr}</span>
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.time}</span>
                                                {appt.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{appt.phone}</span>}
                                            </div>
                                            {appt.notes && (
                                                <div className="mt-2.5 p-2 bg-gray-50 rounded-lg border border-gray-100 flex gap-2 text-xs text-gray-500">
                                                    <span className="shrink-0 pt-0.5 opacity-60">📝</span>
                                                    <p className="line-clamp-2 italic">{appt.notes}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button size="sm" variant="outline" onClick={() => openEdit(appt)} className="h-8 px-3 text-xs">Edit</Button>
                                            <Button size="sm" variant="outline" onClick={() => handleDelete(appt.id)} className="h-8 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">Delete</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editingAppt ? "Edit Appointment" : "Add New Appointment"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 col-span-2">
                                <Label>Customer Name</Label>
                                <Input placeholder="e.g., Nan" value={form.customerName} onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Phone Number</Label>
                                <Input placeholder="08X-XXX-XXXX" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as AppointmentStatus }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label>Service</Label>
                                <Select value={form.serviceId} onValueChange={(v) => setForm(f => ({ ...f, serviceId: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select Service" /></SelectTrigger>
                                    <SelectContent>
                                        {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} — ฿{s.price.toLocaleString()}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Date</Label>
                                <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Time</Label>
                                <Input type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                                <Label>Notes</Label>
                                <Input placeholder="Additional notes..." value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-rose-500 hover:bg-rose-600 text-white">
                            {saving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
