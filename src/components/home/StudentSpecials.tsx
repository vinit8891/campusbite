const meals = [
    "Meal under ₹50",
    "Meal under ₹80",
    "Meal under ₹100",
    "Meal under ₹150",
  ];
  
  export default function StudentSpecials() {
    return (
      <section className="bg-orange-50 py-16">
  
        <div className="mx-auto max-w-7xl px-6">
  
          <h2 className="mb-8 text-3xl font-bold">
            Student Specials
          </h2>
  
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  
            {meals.map((meal) => (
              <div
                key={meal}
                className="rounded-xl bg-white p-6 shadow"
              >
                🍱
  
                <h3 className="mt-4 font-semibold">
                  {meal}
                </h3>
              </div>
            ))}
  
          </div>
  
        </div>
  
      </section>
    );
  }