import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./Components/ThemeProvider";
import { NotificationProvider } from "./Components/PendingRequestContext";
import { AuthProvider } from "./Pages/Authentication/authContext";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <NotificationProvider>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </NotificationProvider>
  </QueryClientProvider>
);






// import ReactDOM from "react-dom/client";
// // import { useEffect } from "react";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ThemeProvider } from "./Components/ThemeProvider";
// import { PendingRequestProvider } from "./Components/PendingRequestContext";
// import { AuthProvider } from "./Pages/Authentication/authContext";
// import App from "./App";
// import "./index.css";
// import reportWebVitals from "./reportWebVitals";

// const queryClient = new QueryClient();

// const root = ReactDOM.createRoot(document.getElementById("root"));
// root.render(
//   <QueryClientProvider client={queryClient}>
//     <PendingRequestProvider>
//       <ThemeProvider>
//         <AuthProvider>
//           <App />
//         </AuthProvider>
//       </ThemeProvider>
//     </PendingRequestProvider>
//   </QueryClientProvider>
// );

// reportWebVitals();






