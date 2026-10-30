import { useAuth } from "../../context/AuthContext";

const SignOutButton = () => {
  const { signOut } = useAuth();

  return (
    <button
      type="button"
      onClick={signOut}
      className="
        inline-flex items-center justify-center
        whitespace-nowrap
        rounded-full
        border border-gray-200
        bg-white
        px-3 py-1.5
        text-xs font-medium text-gray-700
        shadow-sm
        transition-all duration-200
        hover:border-gray-300
        hover:bg-gray-50
        hover:text-gray-900
        focus:outline-none
        focus:ring-2 focus:ring-gray-400/30
        active:scale-95
        sm:px-4 sm:py-2
        sm:text-sm
      "
    >
      Sign out
    </button>
  );
};

export default SignOutButton;
