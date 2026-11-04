import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const navigate = useNavigate();

    const isAuthenticated = () => {
      return !!localStorage.getItem("token");
    };

    useEffect(() => {
      if (!isAuthenticated()) {
        navigate("/auth", { replace: true });
      }
    }, [navigate]);

    if (!isAuthenticated()) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
  return AuthComponent;
};

export default withAuth;
