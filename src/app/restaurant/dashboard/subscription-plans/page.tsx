"use client";

import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRestaurantSubscriptionPlans } from "@/hooks/restaurant/useRestaurantSubscriptionPlans";
import { SubscriptionPlanForm } from "@/components/restaurant/SubscriptionPlanForm";
import { SubscriptionPlanCardList } from "@/components/restaurant/SubscriptionPlanCardList";

export default function RestaurantSubscriptionPlansPage() {
  const {
    plans,
    loading,
    error,
    search,
    setSearch,
    showForm,
    setShowForm,
    editingId,
    form,
    setForm,
    busy,
    loadPlans,
    openCreate,
    openEdit,
    toggleDay,
    handleSubmit,
    handleToggleActive,
    handleDelete,
  } = useRestaurantSubscriptionPlans();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Create reusable mess plans for customers to subscribe.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create plan
        </Button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void loadPlans(search);
        }}
        className="mb-6 flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search plans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <SubscriptionPlanForm
          form={form}
          setForm={setForm}
          editingId={editingId}
          busy={busy}
          onToggleDay={toggleDay}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
          <h2 className="text-xl font-semibold">No subscription plans yet</h2>
          <p className="mt-2 text-muted-foreground">
            Create your first plan so customers can subscribe to your mess.
          </p>
          <Button className="mt-6" onClick={openCreate}>
            Create plan
          </Button>
        </div>
      ) : (
        <SubscriptionPlanCardList
          plans={plans}
          onOpenEdit={openEdit}
          onToggleActive={(plan) => void handleToggleActive(plan)}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}
