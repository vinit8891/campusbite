import { Navbar } from "@/components/layout/navbar";
import Hero from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <SearchBar />
    </>
  );
}