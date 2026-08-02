import { Restaurant } from "@/types";
export const restaurants: Restaurant[] = [
    {
      slug: "pizza-palace",
      name: "Pizza Palace",
      cuisine: "Italian • Pizza",
      rating: 4.8,
      deliveryTime: "25 min",
      distance: "2.1 km",
      image: "/images/restaurants/pizza-palace.jpg",
  
      menu: [
        {
          id: 1,
          name: "Veg Pizza",
          price: 149,
          image: "/images/food/pizza.png",
        },
        {
          id: 2,
          name: "Garlic Bread",
          price: 99,
          image: "/images/food/burger.png",
        },
        {
          id: 3,
          name: "Cold Drink",
          price: 49,
          image: "/images/food/burger.png",
        },
      ],
    },
  
    {
      slug: "burger-hub",
      name: "Burger Hub",
      cuisine: "Fast Food • Burgers",
      rating: 4.7,
      deliveryTime: "20 min",
      distance: "1.5 km",
      image: "/images/restaurants/burger-hub.jpg",
  
      menu: [
        {
          id: 1,
          name: "Veg Burger",
          price: 99,
          image: "/images/food/burger.png",
        },
        {
          id: 2,
          name: "French Fries",
          price: 89,
          image: "/images/food/burger.png",
        },
      ],
    },
  
    {
      slug: "biryani-house",
      name: "Biryani House",
      cuisine: "Indian • Biryani",
      rating: 4.9,
      deliveryTime: "30 min",
      distance: "3 km",
      image: "/images/restaurants/biryani-house.jpg",
  
      menu: [
        {
          id: 1,
          name: "Chicken Biryani",
          price: 179,
          image: "/images/food/biryani.png",
        },
        {
          id: 2,
          name: "Paneer Biryani",
          price: 159,
          image: "/images/food/biryani.png",
        },
      ],
    },
  ];