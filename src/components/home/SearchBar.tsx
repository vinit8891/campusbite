export default function SearchBar() {
    return (
      <section className="-mt-10">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-xl">
  
          <input
            type="text"
            placeholder="Search restaurants, food or mess..."
            className="w-full rounded-lg border p-4"
          />
  
        </div>
      </section>
    );
  }