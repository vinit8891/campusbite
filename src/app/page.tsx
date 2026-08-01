import { Navbar } from "@/components/layout/navbar";

import Hero from "@/components/home/Hero";
import SearchBar from "@/components/home/SearchBar";
import Categories from "@/components/home/Categories";
import StudentSpecials from "@/components/home/StudentSpecials";
import PopularRestaurants from "@/components/home/PopularRestaurants";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        <Hero />
        <SearchBar />
        <Categories />
        <StudentSpecials />
        <PopularRestaurants />
      </main>

      <Footer />
    </>
  );
}