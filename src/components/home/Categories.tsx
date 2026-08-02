import {
  Pizza,
  Beef,
  Soup,
  Salad,
  IceCream,
  Coffee,
} from "lucide-react";

const categories = [
  { name: "Pizza", icon: Pizza },
  { name: "Burger", icon: Beef },
  { name: "Biryani", icon: Soup },
  { name: "Healthy", icon: Salad },
  { name: "Desserts", icon: IceCream },
  { name: "Drinks", icon: Coffee },
];

export function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">

      <h2 className="mb-8 text-3xl font-bold">
        Explore Categories
      </h2>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">

        {categories.map((category) => {
          const Icon = category.icon;

          return (
            <div
              key={category.name}
              className="cursor-pointer rounded-2xl border bg-white p-6 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">

                <Icon className="h-8 w-8 text-orange-500" />

              </div>

              <h3 className="font-semibold">
                {category.name}
              </h3>

            </div>
          );
        })}

      </div>

    </section>
  );
}