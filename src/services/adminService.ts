const API_URL = "http://127.0.0.1:8000";

export async function getRestaurants() {
  const res = await fetch(`${API_URL}/restaurants/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch restaurants");
  }

  return res.json();
}

export async function addRestaurant(data: any) {
  const res = await fetch(`${API_URL}/restaurants/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to add restaurant");
  }

  return res.json();
}

export async function deleteRestaurant(id: string) {
    const res = await fetch(`http://127.0.0.1:8000/restaurants/${id}`, {
      method: "DELETE",
    });
  
    return res.json();
  }

  export async function getRestaurantById(id: string) {
    const res = await fetch(`http://127.0.0.1:8000/restaurants/`, {
      cache: "no-store",
    });
  
    const restaurants = await res.json();
  
    return restaurants.find((restaurant: any) => restaurant._id === id);
  }

  export async function updateRestaurant(
    id: string,
    data: any
  ) {
    const res = await fetch(
      `http://127.0.0.1:8000/restaurants/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
  
    if (!res.ok) {
      throw new Error("Failed to update restaurant");
    }
  
    return res.json();
  }

  export async function getRestaurantBySlug(slug: string) {
    const res = await fetch("http://127.0.0.1:8000/restaurants/", {
      cache: "no-store",
    });
  
    if (!res.ok) {
      throw new Error("Failed to fetch restaurants");
    }
  
    const restaurants = await res.json();
  
    return restaurants.find(
      (restaurant: any) => restaurant.slug === slug
    );
  }
