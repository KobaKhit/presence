"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { WikiGraph } from "@/lib/knowledge/types";

interface WikiGraphVizProps {
  graph: WikiGraph;
  height?: number;
}

export function WikiGraphViz({ graph, height = 420 }: WikiGraphVizProps) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || graph.nodes.length === 0) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth || 720;
    const nodes = graph.nodes.map((n) => ({ ...n }));
    const edges = graph.edges.map((e) => ({ ...e }));

    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(edges)
          .id((d) => (d as { id: string }).id)
          .distance(90)
          .strength(0.55),
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(36));

    const g = svg.append("g");

    const link = g
      .append("g")
      .attr("stroke", "rgba(15, 118, 110, 0.35)")
      .attr("stroke-width", 1.4)
      .selectAll("line")
      .data(edges)
      .join("line");

    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, (typeof nodes)[0]>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            (d as d3.SimulationNodeDatum).fx = (d as d3.SimulationNodeDatum).x;
            (d as d3.SimulationNodeDatum).fy = (d as d3.SimulationNodeDatum).y;
          })
          .on("drag", (event, d) => {
            (d as d3.SimulationNodeDatum).fx = event.x;
            (d as d3.SimulationNodeDatum).fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            (d as d3.SimulationNodeDatum).fx = null;
            (d as d3.SimulationNodeDatum).fy = null;
          }) as never,
      );

    node
      .append("circle")
      .attr("r", (d) => (d.type === "hub" ? 14 : d.type === "entity" ? 11 : 9))
      .attr("fill", (d) =>
        d.type === "hub" ? "#0f766e" : d.type === "entity" ? "#c45c26" : "#14b8a6",
      )
      .attr("fill-opacity", 0.9);

    node
      .append("text")
      .text((d) => d.title)
      .attr("x", 14)
      .attr("y", 4)
      .attr("font-size", 11)
      .attr("fill", "#0d1b2a")
      .attr("font-family", "var(--font-manrope), sans-serif");

    node.on("click", (_event, d) => {
      window.location.href = `/wiki/${d.id}`;
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as d3.SimulationNodeDatum).x ?? 0)
        .attr("y1", (d) => (d.source as d3.SimulationNodeDatum).y ?? 0)
        .attr("x2", (d) => (d.target as d3.SimulationNodeDatum).x ?? 0)
        .attr("y2", (d) => (d.target as d3.SimulationNodeDatum).y ?? 0);

      node.attr(
        "transform",
        (d) => `translate(${(d as d3.SimulationNodeDatum).x ?? 0},${(d as d3.SimulationNodeDatum).y ?? 0})`,
      );
    });

    return () => {
      simulation.stop();
    };
  }, [graph, height]);

  return (
    <svg
      ref={ref}
      width="100%"
      height={height}
      className="animate-fade rounded-2xl border border-line bg-white/50"
      role="img"
      aria-label="Wiki link graph"
    />
  );
}
