import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { Button } from "../../components/admin/ui/Button";
import { Checkbox } from "../../components/admin/ui/Checkbox";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Label } from "../../components/admin/ui/Label";
import { Select } from "../../components/admin/ui/Select";
import { TextArea } from "../../components/admin/ui/TextArea";
import { useQrDataUrl } from "../../hooks/useQrDataUrl";
import { apiFetch } from "../../lib/apiClient";

type Seller = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  whatsapp_number: string | null;
  upi_id: string | null;
  upi_name: string | null;
  is_accepting_orders: boolean;
};

type Member = { user_id: string; role: "owner" | "staff"; phone: string | null };

export function DashboardSettingsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["seller-settings-page"],
    queryFn: () => apiFetch<Seller>("/api/seller/settings"),
  });

  const membersQuery = useQuery({
    queryKey: ["seller-members"],
    queryFn: () => apiFetch<Member[]>("/api/seller/members"),
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [upiId, setUpiId] = useState("");
  const [upiName, setUpiName] = useState("");
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setName(settingsQuery.data.name);
      setSlug(settingsQuery.data.slug);
      setDescription(settingsQuery.data.description ?? "");
      setAddress(settingsQuery.data.address ?? "");
      setWhatsapp(settingsQuery.data.whatsapp_number ?? "");
      setUpiId(settingsQuery.data.upi_id ?? "");
      setUpiName(settingsQuery.data.upi_name ?? "");
      setAcceptingOrders(settingsQuery.data.is_accepting_orders);
    }
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch("/api/seller/settings", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          slug,
          description,
          address,
          whatsapp_number: whatsapp,
          upi_id: upiId,
          upi_name: upiName,
          is_accepting_orders: acceptingOrders,
        }),
      }),
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["seller-settings-page"] });
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Could not save settings");
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const [memberPhone, setMemberPhone] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "staff">("staff");
  const [memberError, setMemberError] = useState<string | null>(null);

  const addMember = useMutation({
    mutationFn: () =>
      apiFetch("/api/seller/members", {
        method: "POST",
        body: JSON.stringify({ phone: memberPhone, role: memberRole }),
      }),
    onSuccess: () => {
      setMemberPhone("");
      setMemberError(null);
      queryClient.invalidateQueries({ queryKey: ["seller-members"] });
    },
    onError: (err) => {
      setMemberError(err instanceof Error ? err.message : "Could not add member");
    },
  });

  function handleAddMember(e: FormEvent) {
    e.preventDefault();
    addMember.mutate();
  }

  const storeUrl =
    settingsQuery.data && typeof window !== "undefined"
      ? `${window.location.origin}/s/${settingsQuery.data.slug}`
      : "";
  const qrDataUrl = useQrDataUrl(storeUrl);

  if (settingsQuery.isLoading) {
    return (
      <div>
        <Breadcrumb title="Settings" />
        <p className="text-sm text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumb title="Settings" description="Store profile, payments, and who can manage orders." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title="Store profile">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="store-name">Store name</Label>
              <Input id="store-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="store-slug">Store link (slug)</Label>
              <Input id="store-slug" type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="store-about">About your store</Label>
              <TextArea
                id="store-about"
                rows={3}
                maxLength={500}
                placeholder="What do you sell? Shown at the top of your store page."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="store-address">Address</Label>
              <TextArea
                id="store-address"
                rows={2}
                maxLength={300}
                placeholder="Shop or pickup address (optional)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="store-whatsapp">WhatsApp number</Label>
              <Input id="store-whatsapp" type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="store-upi-id">UPI ID</Label>
              <Input id="store-upi-id" type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="store-upi-name">UPI display name</Label>
              <Input id="store-upi-name" type="text" value={upiName} onChange={(e) => setUpiName(e.target.value)} />
            </div>
            <Checkbox
              id="store-accepting"
              label="Accepting orders"
              checked={acceptingOrders}
              onChange={(e) => setAcceptingOrders(e.target.checked)}
            />
            {formError && <p className="text-sm text-error-600">{formError}</p>}
            <Button type="submit" disabled={save.isPending} fullWidth>
              {save.isPending ? "Saving..." : "Save settings"}
            </Button>
          </form>
        </ComponentCard>

        <div className="space-y-6">
          {storeUrl && (
            <ComponentCard title="Share your store">
              <div className="text-center">
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="Store QR code" className="mx-auto mb-3 h-40 w-40 rounded-lg" />
                )}
                <p className="break-all text-xs text-gray-600">{storeUrl}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigator.clipboard.writeText(storeUrl)}
                >
                  Copy link
                </Button>
              </div>
            </ComponentCard>
          )}

          <ComponentCard title="Team members">
            <div className="divide-y divide-gray-100">
              {membersQuery.data?.map((member) => (
                <div key={member.user_id} className="flex justify-between py-2.5 text-sm">
                  <span>{member.phone ?? member.user_id}</span>
                  <span className="text-xs text-gray-500">{member.role}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMember} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="tel"
                placeholder="Phone number"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                className="flex-1"
                required
              />
              <Select
                options={[
                  { value: "staff", label: "Staff" },
                  { value: "owner", label: "Owner" },
                ]}
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as "owner" | "staff")}
                className="sm:w-32"
              />
              <Button type="submit" disabled={addMember.isPending}>
                Add
              </Button>
            </form>
            {memberError && <p className="mt-2 text-xs text-error-600">{memberError}</p>}
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
