// The single, fixed auth.users identity behind the superadmin username+password
// login (see superadminAuthController). Not a real contact number — just a
// stable phone value to hang one auth user off, reusing findOrCreateAuthUserByPhone
// the same way every other login path in this app creates its auth user.
export const SUPERADMIN_IDENTITY_PHONE = "+919990003333";
