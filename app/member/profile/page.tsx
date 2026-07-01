"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

export default function MemberProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [bankId, setBankId] = useState("");
  const [kinId, setKinId] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    occupation: "",
    investmentPreferences: "",
    meansOfIdentification: "",
    idNumber: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    nextOfKinName: "",
    nextOfKinRelationship: "",
    nextOfKinPhone: "",
    nextOfKinEmail: "",
    nextOfKinAddress: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: memberData } = await supabase
      .from("members")
      .select(`
        *,
        member_bank_details (*),
        next_of_kin (*)
      `)
      .eq("user_id", user.id)
      .single();

    if (!memberData) {
      router.push("/login");
      return;
    }

    const bank = memberData.member_bank_details?.[0];
    const kin = memberData.next_of_kin?.[0];

    setMember(memberData);
    setBankId(bank?.id || "");
    setKinId(kin?.id || "");

    setForm({
      fullName: memberData.full_name || "",
      phone: memberData.phone || "",
      address: memberData.address || "",
      occupation: memberData.occupation || "",
      investmentPreferences: memberData.investment_preferences || "",
      meansOfIdentification: memberData.means_of_identification || "",
      idNumber: memberData.id_number || "",
      bankName: bank?.bank_name || "",
      accountName: bank?.account_name || "",
      accountNumber: bank?.account_number || "",
      nextOfKinName: kin?.full_name || "",
      nextOfKinRelationship: kin?.relationship || "",
      nextOfKinPhone: kin?.phone || "",
      nextOfKinEmail: kin?.email || "",
      nextOfKinAddress: kin?.address || "",
    });

    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error: memberError } = await supabase
        .from("members")
        .update({
          full_name: form.fullName,
          phone: form.phone,
          address: form.address,
          occupation: form.occupation,
          investment_preferences: form.investmentPreferences,
          means_of_identification: form.meansOfIdentification,
          id_number: form.idNumber,
        })
        .eq("id", member.id);

      if (memberError) throw memberError;

      if (bankId) {
        const { error } = await supabase
          .from("member_bank_details")
          .update({
            bank_name: form.bankName,
            account_name: form.accountName,
            account_number: form.accountNumber,
          })
          .eq("id", bankId);

        if (error) throw error;
      }

      if (kinId) {
        const { error } = await supabase
          .from("next_of_kin")
          .update({
            full_name: form.nextOfKinName,
            relationship: form.nextOfKinRelationship,
            phone: form.nextOfKinPhone,
            email: form.nextOfKinEmail,
            address: form.nextOfKinAddress,
          })
          .eq("id", kinId);

        if (error) throw error;
      }

      setMessage("Profile updated successfully.");
      await loadProfile();
    } catch (error: any) {
      setMessage(error.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading profile...
      </main>
    );
  }

  return (
    <AppShell
      title="My Profile"
      subtitle={`Membership No: ${member?.membership_number || "N/A"}`}
      role="member"
    >
      <form
        onSubmit={saveProfile}
        className="rounded-3xl border border-white/10 bg-white/5 p-6"
      >
        <h2 className="text-xl font-semibold">Personal Information</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Input label="Full Name" value={form.fullName} onChange={(v) => updateField("fullName", v)} />
          <Input label="Phone" value={form.phone} onChange={(v) => updateField("phone", v)} />
          <Input label="Address" value={form.address} onChange={(v) => updateField("address", v)} />
          <Input label="Occupation" value={form.occupation} onChange={(v) => updateField("occupation", v)} />
          <Input label="Investment Preferences" value={form.investmentPreferences} onChange={(v) => updateField("investmentPreferences", v)} />
          <Input label="Means of Identification" value={form.meansOfIdentification} onChange={(v) => updateField("meansOfIdentification", v)} />
          <Input label="ID Number" value={form.idNumber} onChange={(v) => updateField("idNumber", v)} />
        </div>

        <h2 className="mt-8 text-xl font-semibold">Bank Details</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Input label="Bank Name" value={form.bankName} onChange={(v) => updateField("bankName", v)} />
          <Input label="Account Name" value={form.accountName} onChange={(v) => updateField("accountName", v)} />
          <Input label="Account Number" value={form.accountNumber} onChange={(v) => updateField("accountNumber", v)} />
        </div>

        <h2 className="mt-8 text-xl font-semibold">Next of Kin</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <Input label="Next of Kin Name" value={form.nextOfKinName} onChange={(v) => updateField("nextOfKinName", v)} />
          <Input label="Relationship" value={form.nextOfKinRelationship} onChange={(v) => updateField("nextOfKinRelationship", v)} />
          <Input label="Phone" value={form.nextOfKinPhone} onChange={(v) => updateField("nextOfKinPhone", v)} />
          <Input label="Email" value={form.nextOfKinEmail} onChange={(v) => updateField("nextOfKinEmail", v)} />
          <Input label="Address" value={form.nextOfKinAddress} onChange={(v) => updateField("nextOfKinAddress", v)} />
        </div>

        <button
          disabled={saving}
          className="mt-8 w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {message && (
          <div className="mt-5 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm">
            {message}
          </div>
        )}
      </form>
    </AppShell>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}