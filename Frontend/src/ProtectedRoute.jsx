import { useAuth } from "./Pages/Authentication/useAuth";
import { Navigate } from "react-router-dom";


const ProtectedRoute = ({ children, allowedRoles }) => {
const { user, loading } = useAuth();

  
 // Wait until user cookie is checked
  if (loading) {
    return <div>Loading...</div>;
  }



  // If user still not found after loading
  if (!user) {
    console.warn("ProtectedRoute: No user found, redirecting to login");
    return <Navigate to="/" replace />;
  }

  // Check role access
  if (!allowedRoles.includes(user.role)) {
    console.warn(`ProtectedRoute: Role ${user.role} not allowed`);
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Allow access
  return children;
};
export default ProtectedRoute;

// import {jwtDecode} from 'jwt-decode';
// import { getAccessToken, clearTokens } from './Pages/Authentication/auth';
// import { getDecodedDataFromIndexedDB } from './tokenstorage';


// const ProtectedRoute = ({ children, allowedRoles }) => {

//   const [userRole, setUserRole] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);


//   const isTokenExpired = (token) => {

//     if (!token) return true;
//     try {
//       const { exp } = jwtDecode(token);
//       const currentTime = Date.now() / 1000;
//       return exp < currentTime;
//     } catch (error) {
//       console.error("Invalid token:", error);
//       return true;
//     }
//   };

//   useEffect(() => {
//     const fetchRole = async () => {
//       const token = getAccessToken(); // Check if the token exists
//       if (!token || isTokenExpired(token)) {
//         clearTokens();
//         setIsLoading(false); 
//         return;
//       }

//       try {
//         const decodedData = await getDecodedDataFromIndexedDB();
//         if (decodedData && decodedData.role) {
//           setUserRole(decodedData.role);
//         }
//       } catch (error) {
//         console.error("Error fetching user role:", error);
//       } finally {
//         setIsLoading(false); // Ensure loading state ends
//       }
//     };

//     fetchRole();
//   }, []);

//   if (isLoading) {
//     return <div>Loading...</div>; 
//   }

//   if (!userRole || !allowedRoles.includes(userRole)) {
//     return <Navigate to="/" replace />; // Redirect if role doesn't match
//   }

//   return children; 
// };
// export default ProtectedRoute;
