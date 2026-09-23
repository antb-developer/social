import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "../../components/admin/Breadcrumb";
import { LogoutIcon } from "../../components/admin/icons";
import { Button } from "../../components/admin/ui/Button";
import { ComponentCard } from "../../components/admin/ui/ComponentCard";
import { Input } from "../../components/admin/ui/Input";
import { Label } from "../../components/admin/ui/Label";
import { EnableNotificationsButton } from "../../components/EnableNotificationsButton";
import { useAuth } from "../../context/AuthContext";
import { useMe, type Me } from "../../hooks/useMe";
import { apiFetch } from "../../lib/apiClient";

function ProfileForm({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(me.name ?? "");

  const save = useMutation({
    mutationFn: () => apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="account-name">Your name</Label>
        <Input
          id="account-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="account-phone">Mobile number</Label>
        <Input
          id="account-phone"
          type="tel"
          value={me.phone}
          disabled
          readOnly
          hint="This is your login number, so it can't be changed here."
        />
      </div>
      {save.isError && (
        <p className="text-sm text-error-600">
          {save.error instanceof Error ? save.error.message : "Could not save your name"}
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={save.isPending || !name.trim()}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
        {save.isSuccess && <span className="text-sm text-success-600">Saved</span>}
      </div>
    </form>
  );
}

export function AccountSettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const meQuery = useMe();

  async function handleLogout() {
    await signOut();
    navigate("/login?role=customer");
  }

  return (
    <div>
      <Breadcrumb
        title="Settings"
        description="Your profile, notifications and session."
        homeTo="/account"
        homeLabel="Account"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ComponentCard title="Profile">
          {meQuery.isLoading && <p className="text-sm text-gray-500">Loading profile...</p>}
          {meQuery.isError && <p className="text-sm text-error-600">Could not load your profile.</p>}
          {meQuery.isSuccess && <ProfileForm me={meQuery.data} />}
        </ComponentCard>

        <div className="space-y-6">
          <ComponentCard title="Notifications" desc="Get a push alert when a store replies or updates your order.">
            <EnableNotificationsButton />
          </ComponentCard>

          <ComponentCard title="Session" desc="Log out of Order Desk on this device.">
            <Button variant="outline" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Log out
            </Button>
          </ComponentCard>
        </div>
      </div>
    </div>
  );
}
