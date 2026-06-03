import { useState } from "react";
import Nav from "./components/Nav.jsx";
import TerminalDuel from "./components/TerminalDuel.jsx";
import Hero from "./components/Hero.jsx";
import Commands from "./components/Commands.jsx";
import DemoCTA from "./components/DemoCTA.jsx";
import Footer from "./components/Footer.jsx";
import DemoModal from "./components/DemoModal.jsx";

export default function App() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <>
      <Nav onDemo={openDemo} />
      <main>
        <TerminalDuel onDemo={openDemo} />
        <Hero onDemo={openDemo} />
        <Commands />
        <DemoCTA onDemo={openDemo} />
      </main>
      <Footer onDemo={openDemo} />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
