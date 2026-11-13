// Makes Clerk's login box match the site's "Pearl Aurora" look.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#ff3d7f",
    colorText: "#120f1c",
    colorTextSecondary: "#7b758a",
    colorBackground: "transparent",
    colorInputBackground: "#ffffff",
    colorInputText: "#120f1c",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    borderRadius: "1rem",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none", border: "none", background: "transparent" },
    card: { boxShadow: "none", border: "none", background: "transparent" },
    headerTitle: { fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontWeight: 800 },
    formButtonPrimary: {
      background: "linear-gradient(110deg,#ff3d7f 0%,#ff8a5c 35%,#9b6bff 72%,#38b6ff 100%)",
      border: "none",
      borderRadius: "999px",
      fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      fontWeight: 700,
      textTransform: "none",
      boxShadow: "0 14px 30px -12px rgba(255,61,127,.75)",
    },
    formFieldInput: { borderRadius: "999px", borderColor: "rgba(18,15,28,.12)" },
    footerAction: { display: "none" }, // sign-up is closed: only the two of you have accounts
  },
};
