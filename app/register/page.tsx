"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
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

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Registration failed.");
      }

      setMessage(
        `Registration successful. Your membership number is ${result.membership_number}.   You can now login.`
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (error: any) {
      setMessage(error.message || "Unable to complete registration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Join LP45 Private Investment Club</h1>
        <p className="mt-2 text-slate-300">
          Register as a private investment club member.
        </p>

        <form onSubmit={handleRegister} className="mt-8 grid gap-5 md:grid-cols-2">
          <Input label="Full Name" value={form.fullName} onChange={(v) => updateField("fullName", v)} />
          <Input label="Email Address" type="email" value={form.email} onChange={(v) => updateField("email", v)} />
          <Input label="Password" type="password" value={form.password} onChange={(v) => updateField("password", v)} />
          <Input label="Phone Number" value={form.phone} onChange={(v) => updateField("phone", v)} />
          <Input label="Address" value={form.address} onChange={(v) => updateField("address", v)} />
          <Input label="Occupation" value={form.occupation} onChange={(v) => updateField("occupation", v)} />
          <Input label="Investment Preferences" value={form.investmentPreferences} onChange={(v) => updateField("investmentPreferences", v)} />
          <Input label="Means of Identification" value={form.meansOfIdentification} onChange={(v) => updateField("meansOfIdentification", v)} />
          <Input label="ID Number" value={form.idNumber} onChange={(v) => updateField("idNumber", v)} />

          <div className="md:col-span-2 mt-4">
            <h2 className="text-xl font-semibold">Bank Details for ROI Payment</h2>
          </div>

          <Input label="Bank Name" value={form.bankName} onChange={(v) => updateField("bankName", v)} />
          <Input label="Account Name" value={form.accountName} onChange={(v) => updateField("accountName", v)} />
          <Input label="Account Number" value={form.accountNumber} onChange={(v) => updateField("accountNumber", v)} />

          <div className="md:col-span-2 mt-4">
            <h2 className="text-xl font-semibold">Next of Kin</h2>
          </div>

          <Input label="Next of Kin Name" value={form.nextOfKinName} onChange={(v) => updateField("nextOfKinName", v)} />
          <Input label="Relationship" value={form.nextOfKinRelationship} onChange={(v) => updateField("nextOfKinRelationship", v)} />
          <Input label="Next of Kin Phone" value={form.nextOfKinPhone} onChange={(v) => updateField("nextOfKinPhone", v)} />
          <Input label="Next of Kin Email" value={form.nextOfKinEmail} onChange={(v) => updateField("nextOfKinEmail", v)} />
          <Input label="Next of Kin Address" value={form.nextOfKinAddress} onChange={(v) => updateField("nextOfKinAddress", v)} />

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Membership Account"}
            </button>
          </div>
        </form>

        {message && (
          <div className="mt-6 rounded-xl border border-white/10 bg-slate-900 p-4 text-sm text-slate-200">
            {message}
          </div>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400"
      />
    </label>
  );
}