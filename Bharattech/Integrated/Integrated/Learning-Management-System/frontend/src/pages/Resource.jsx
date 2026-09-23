import React from "react";
import { Plus, Loader2 } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { Btn } from "../components/ui/ButtonPrimitive";
import IntegratedToolsSection from "../components/resource/IntegratedToolsSection";
import ResourceCard from "../components/resource/ResourceCard";
import AddResourceModal from "../components/resource/AddResourceModal";
import { useResourceData } from "../hooks/useResourceData";

export default function Resource() {
  const {
    resources, users, title, setTitle, link, setLink,
    isAdding, setIsAdding, selectedUser, setSelectedUser,
    pageLoading, authLoading, error, isDeleting,
    isLaunchingLibreChat, isLaunchingPlane, isLaunchingSecuro, isLaunchingChatwoot,
    isAdmin, canAccessInvoice,
    openCoder, openLibreChat, openPlane, openSecuro, openChatwoot, openInvoiceBuilder,
    downloadBharatTechApp, handleDelete, handleAdd, assignResource,
    retryLoad
  } = useResourceData();

  if (authLoading || pageLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-base font-medium text-slate-500">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <Toaster position="bottom-right" />

      {/* HERO */}
      <header className="bharat-hero-banner relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
        <div className="bharat-hero-glow" />
        <div className="bharat-hero-beams" />

        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                BharatTech Platform
              </span>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
              Resources
            </h1>
            <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
              Manage all resources for the BharatTech Platform
            </p>
          </div>

          {isAdmin && (
            <Btn
              variant="outlineBlue"
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold"
            >
              <Plus className="h-3.5 w-3.5 text-blue-700" />
              <span>Add Resource</span>
            </Btn>
          )}
        </div>
      </header>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-600">{error}</p>
          <Btn variant="danger" size="sm" onClick={retryLoad}>
            Retry
          </Btn>
        </div>
      )}

      {/* GRID */}
      <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <IntegratedToolsSection
          openCoder={openCoder}
          downloadBharatTechApp={downloadBharatTechApp}
          openLibreChat={openLibreChat}
          isLaunchingLibreChat={isLaunchingLibreChat}
          openChatwoot={openChatwoot}
          isLaunchingChatwoot={isLaunchingChatwoot}
          openPlane={openPlane}
          isLaunchingPlane={isLaunchingPlane}
          openSecuro={openSecuro}
          isLaunchingSecuro={isLaunchingSecuro}
          openInvoiceBuilder={openInvoiceBuilder}
          canAccessInvoice={canAccessInvoice}
        />

        {resources.map((r) => (
          <ResourceCard
            key={r?._id}
            resource={r}
            isAdmin={isAdmin}
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            handleDelete={handleDelete}
            isDeleting={isDeleting}
            assignResource={assignResource}
          />
        ))}
      </div>

      <AddResourceModal
        isOpen={isAdding && isAdmin}
        onClose={() => {
          setIsAdding(false);
          setTitle("");
          setLink("");
        }}
        title={title}
        setTitle={setTitle}
        link={link}
        setLink={setLink}
        handleAdd={handleAdd}
      />
    </div>
  );
}
