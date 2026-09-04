import { Navbar } from "@/components/layout/navbar";
import Hero from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { Categories } from "@/components/home/Categories";
import { OrderAgainCarousel } from "@/components/home/OrderAgainCarousel";
import { StudentSpecials } from "@/components/home/StudentSpecials";
import { PopularRestaurants } from "@/components/home/PopularRestaurants";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="pb-32">
        {/* 1. Location Header & Unified Tactile Search */}
        <Hero />
        <SearchBar />

        {/* 2. Campus Batch Drop Promo Banner */}
        <section className="mx-auto max-w-7xl px-4 md:px-6 pt-1 pb-2">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-3.5 text-white shadow-md shadow-orange-500/15">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-lg">
                ⚡
              </div>
              <div>
                <p className="text-xs md:text-sm font-bold tracking-tight">
                  ₹15 Batch Drop to Hostels
                </p>
                <p className="text-[11px] text-orange-100 font-medium">
                  Next batch leaving in 12 mins • Delivered straight to your lobby
                </p>
              </div>
            </div>
            <Link
              href={ROUTES.RESTAURANTS}
              className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-orange-600 shadow-xs hover:bg-orange-50 transition-colors"
            >
              Order Now
            </Link>
          </div>
        </section>

        {/* 3. What's on your mind? (Vibrant Category Circles) */}
        <Categories />

        {/* 4. Order Again (if past orders exist) */}
        <OrderAgainCarousel />

        {/* 5. Student Specials & Popular Campus Eateries */}
        <StudentSpecials />
        <PopularRestaurants />
      </main>
    </>
  );
}