import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const restaurantHandlers = [
  http.get(url("/restaurants/"), () => {
    return HttpResponse.json({
      items: [
        {
          _id: "rest-1",
          name: "Campus Diner",
          email: "diner@campus.edu",
          slug: "campus-diner",
          cuisine: "North Indian",
          rating: 4.8,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
  }),

  http.get(url("/restaurants/:id"), () => {
    return HttpResponse.json({
      _id: "rest-1",
      name: "Campus Diner",
      email: "diner@campus.edu",
      slug: "campus-diner",
      cuisine: "North Indian",
      rating: 4.8,
      menu: [
        {
          _id: "menu-1",
          name: "Paneer Butter Masala",
          price: 180,
          category: "Curry",
          available: true,
        },
      ],
    });
  }),

  http.get(url("/menu/categories/:email"), () => {
    return HttpResponse.json(["Curry", "Rice", "Bread"]);
  }),

  http.get(url("/menu/:email"), () => {
    return HttpResponse.json({
      items: [
        {
          _id: "menu-1",
          name: "Paneer Butter Masala",
          price: 180,
          category: "Curry",
          available: true,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
  }),

  http.put(url("/menu/:id"), () => {
    return HttpResponse.json({ message: "Menu updated" });
  }),

  http.delete(url("/menu/:id"), () => {
    return HttpResponse.json({ message: "Menu deleted" });
  }),
];
