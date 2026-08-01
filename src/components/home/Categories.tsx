const categories = [
    "Pizza",
    "Burger",
    "Biryani",
    "Chinese",
    "South Indian",
    "Thali",
  ];
  
  export default function Categories() {
    return (
      <section className="py-16">
  
        <div className="mx-auto max-w-7xl px-6">
  
          <h2 className="mb-8 text-3xl font-bold">
            Categories
          </h2>
  
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
  
            {categories.map((item) => (
              <div
                key={item}
                className="rounded-xl border p-8 text-center shadow hover:shadow-lg"
              >
                🍴
                <p className="mt-4">{item}</p>
              </div>
            ))}
  
          </div>
  
        </div>
  
      </section>
    );
  }