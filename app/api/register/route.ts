import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (authError) throw authError;

    const user = authData.user;

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: user.id,
      email: body.email,
      full_name: body.fullName,
      role: "member",
      status: "active",
    });

    if (profileError) throw profileError;

    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        user_id: user.id,
        full_name: body.fullName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        occupation: body.occupation,
        investment_preferences: body.investmentPreferences,
        means_of_identification: body.meansOfIdentification,
        id_number: body.idNumber,
        status: "pending",
      })
      .select("id, membership_number")
      .single();

    if (memberError) throw memberError;

    await supabaseAdmin.from("member_bank_details").insert({
      member_id: memberData.id,
      bank_name: body.bankName,
      account_name: body.accountName,
      account_number: body.accountNumber,
    });

    await supabaseAdmin.from("next_of_kin").insert({
      member_id: memberData.id,
      full_name: body.nextOfKinName,
      relationship: body.nextOfKinRelationship,
      phone: body.nextOfKinPhone,
      email: body.nextOfKinEmail,
      address: body.nextOfKinAddress,
    });

    return NextResponse.json({
      success: true,
      membership_number: memberData.membership_number,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}