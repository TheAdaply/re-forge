import { useState } from "react";
import Nav from "./components/Nav.jsx";
import TerminalDuel from "./components/TerminalDuel.jsx";
import Hero from "./components/Hero.jsx";
import Gates from "./components/Gates.jsx";
import Receipts from "./components/Receipts.jsx";
import Commands from "./components/Commands.jsx";
import Playbooks from "./components/Playbooks.jsx";
import PapersProof from "./components/PapersProof.jsx";
import DemoCTA from "./components/DemoCTA.jsx";
import Footer from "./components/Footer.jsx";
import DemoModal from "./components/DemoModal.jsx";

export default function App() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <>
      <Nav onDemo={openDemo} />
      {/* Narrative order: what it is (Hero, install + trust chips) -> watch it
          run (TerminalDuel) -> how the gates work -> receipts -> shipped research
          (accepted papers) -> command surface -> the published playbooks
          behind the agents -> act. */}
      <main>
        <Hero onDemo={openDemo} />
        <TerminalDuel onDemo={openDemo} />
        <Gates />
        <Receipts />
        <PapersProof />
        <Commands />
        <Playbooks />
        <DemoCTA onDemo={openDemo} />
      </main>
      <Footer onDemo={openDemo} />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
