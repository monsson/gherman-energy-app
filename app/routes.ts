import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  layout("routes/auth-layout.tsx", [
    route("manager", "routes/manager.dashboard.tsx"),
    route("manager/cars", "routes/manager.cars.tsx"),
    route("manager/transactions", "routes/manager.transactions.tsx"),
    route("manager/receipts", "routes/manager.receipts.tsx"),
    route("manager/receipts/:id", "routes/manager.receipt.tsx"),
    route("manager/station/:id", "routes/manager.station.tsx"),
    route("driver", "routes/driver.dashboard.tsx"),
    route("car/:id", "routes/car.detail.tsx"),
  ]),
] satisfies RouteConfig;
