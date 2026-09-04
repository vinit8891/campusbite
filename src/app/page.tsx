import { Navbar } from "@/components/layout/navbar";
import Hero from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { OrderAgainCarousel } from "@/components/home/OrderAgainCarousel";
import { Categories } from "@/components/home/Categories";
import { StudentSpecials } from "@/components/home/StudentSpecials";
import { PopularRestaurants } from "@/components/home/PopularRestaurants";

export default function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <SearchBar />
        <OrderAgainCarousel />
        <Categories />
        <StudentSpecials />
        <PopularRestaurants />
      </main>
    </>
  );
}