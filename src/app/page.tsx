import { Navbar } from "@/components/layout/navbar";
import Hero from "@/components/home/Hero";
import { SearchBar } from "@/components/home/SearchBar";
import { Categories } from "@/components/home/Categories";
import { StudentSpecials } from "@/components/home/StudentSpecials";

export default function Home() {
  return (
    <>
    <Navbar />
    <Hero />
    <SearchBar />
    <Categories />
    <StudentSpecials />
  </>
  );
}