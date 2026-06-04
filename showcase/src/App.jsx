import { useState } from "react";
import Nav from "./components/Nav.jsx";
import AgentDuel from "./components/AgentDuel.jsx";
import Hero from "./components/Hero.jsx";
import Swarm from "./components/Swarm.jsx";
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
          run as an animated split-stage film (AgentDuel: lone agent vs
          coordinated teams) -> watch the swarm work in one looped simulation
          (Swarm) -> receipts -> shipped research (accepted papers) -> command
          surface -> the published playbooks behind the agents -> act. */}
      <main>
        <Hero onDemo={openDemo} />
        <PapersProof />
        <AgentDuel onDemo={openDemo} />
        <Swarm />
        <Receipts />
        <Commands />
        <Playbooks />
        <DemoCTA onDemo={openDemo} />
      </main>
      <Footer onDemo={openDemo} />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
