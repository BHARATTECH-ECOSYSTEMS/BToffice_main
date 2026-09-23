import React from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function UserFormFields({
  formData,
  setFormData,
  errors,
  isActorSuperAdmin,
}) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="text-sm font-medium mb-1 block">Name *</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? "border-red-500" : ""}
          placeholder="Enter full name"
          required
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="email" className="text-sm font-medium mb-1 block">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={errors.email ? "border-red-500" : ""}
          placeholder="user@example.com"
          required
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      <div>
        <Label htmlFor="role" className="text-sm font-medium mb-1 block">Role *</Label>
        <div className="relative">
          <select
            id="role"
            value={formData.role.toLowerCase()}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className={`w-full px-3 py-2 pr-12 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${errors.role ? "border-red-500" : ""}`}
            required
          >
            <option value="employee">Employee</option>
            <option value="intern">Intern</option>
            <option value="subadmin">Subadmin</option>
            <option value="admin">Admin</option>
            {isActorSuperAdmin && <option value="superadmin">Superadmin</option>}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
      </div>

      <div>
        <Label htmlFor="status" className="text-sm font-medium mb-1 block">Status *</Label>
        <div className="relative">
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 pr-12 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            required
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    </>
  );
}
