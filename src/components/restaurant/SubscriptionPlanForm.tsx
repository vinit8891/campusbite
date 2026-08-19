import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectClassName } from "@/lib/formatters";
import { WEEKDAYS } from "@/hooks/restaurant/useRestaurantSubscriptionPlans";
import type { SubscriptionPlanInput } from "@/services/subscriptionPlanService";
import type { MealType, SubscriptionType, Weekday } from "@/types";

type SubscriptionPlanFormProps = {
  form: SubscriptionPlanInput;
  setForm: React.Dispatch<React.SetStateAction<SubscriptionPlanInput>>;
  editingId: string | null;
  busy: boolean;
  onToggleDay: (day: Weekday) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
};

export function SubscriptionPlanForm({
  form,
  setForm,
  editingId,
  busy,
  onToggleDay,
  onSubmit,
  onCancel,
}: SubscriptionPlanFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold">
        {editingId ? "Edit plan" : "Create plan"}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Name</span>
          <Input
            required
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </label>

        <label className="space-y-1 text-sm sm:col-span-2">
          <span>Description</span>
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Plan type</span>
          <select
            className={selectClassName}
            value={form.subscription_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                subscription_type: e.target.value as SubscriptionType,
              }))
            }
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Meal type</span>
          <select
            className={selectClassName}
            value={form.meal_type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                meal_type: e.target.value as MealType,
              }))
            }
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="combo">Combo</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Price (₹)</span>
          <Input
            type="number"
            min="1"
            step="0.01"
            required
            value={form.price || ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                price: Number(e.target.value),
              }))
            }
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, active: e.target.checked }))
            }
          />
          Plan is active
        </label>

        <label className="space-y-1 text-sm">
          <span>Start time</span>
          <Input
            type="time"
            required
            value={form.start_time}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, start_time: e.target.value }))
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>End time</span>
          <Input
            type="time"
            required
            value={form.end_time}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, end_time: e.target.value }))
            }
          />
        </label>

        <div className="sm:col-span-2">
          <p className="mb-2 text-sm">Delivery days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => onToggleDay(day)}
                className={`rounded-full px-3 py-1 text-sm capitalize ${
                  form.delivery_days.includes(day)
                    ? "bg-orange-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button type="submit" disabled={busy}>
          {editingId ? "Save changes" : "Create plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
