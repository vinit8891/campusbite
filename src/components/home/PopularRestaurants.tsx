const restaurants = [
    "Domino's",
    "Pizza Hut",
    "Annapurna Mess",
    "Food Court",
  ];
  
  export default function PopularRestaurants() {
    return (
      <section className="py-16">
  
        <div className="mx-auto max-w-7xl px-6">
  
          <h2 className="mb-8 text-3xl font-bold">
            Popular Restaurants
          </h2>
  
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  
            {restaurants.map((restaurant) => (
              <div
                key={restaurant}
                className="rounded-xl border p-6 shadow"
              >
                🍕
                <h3 className="mt-4 font-semibold">
                  {restaurant}
                </h3>
              </div>
            ))}
  
          </div>
  
        </div>
  
      </section>
    );
  }