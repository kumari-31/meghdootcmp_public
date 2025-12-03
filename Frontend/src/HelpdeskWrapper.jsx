const HelpdeskWrapper = ({ path }) => (
  <iframe
    src={path}
    style={{
      width: "100%",
      height: "calc(100vh - 64px)", // adjust based on your header
      border: "none",
    }}
  />
);

export default HelpdeskWrapper;
