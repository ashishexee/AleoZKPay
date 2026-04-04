"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "../../../../shared/components/ui/badge";
import { Button } from "../../../../shared/components/ui/button-shadcn";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../shared/components/ui/card";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  description: string;
  icon: React.ElementType;
  category?: string;
  relatedIds?: number[];
  status?: "completed" | "in-progress" | "pending";
  energy?: number;
  accentColor?: string;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval>;

    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate]);

  const centerViewOnNode = (nodeId: number) => {
    if (!nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 210;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.35,
      Math.min(1, 0.35 + 0.65 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem?.relatedIds || [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusBadgeClass = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "in-progress":
        return "bg-white/10 text-white border-white/20";
      case "pending":
        return "bg-white/5 text-white/40 border-white/10";
      default:
        return "bg-white/5 text-white/40 border-white/10";
    }
  };

  const getStatusLabel = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "COMPLETE";
      case "in-progress":
        return "IN PROGRESS";
      case "pending":
        return "PENDING";
      default:
        return "PENDING";
    }
  };

  return (
    <div
      className="w-full h-[620px] flex flex-col items-center justify-center overflow-hidden relative"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      {/* Orbit background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[440px] h-[440px] rounded-full border border-orange-500/5" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-orange-500/[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{ perspective: "1000px" }}
        >
          {/* Center core - NullPay branded */}
          <div className="absolute w-16 h-16 rounded-full flex items-center justify-center z-10">
            {/* Beam rings */}
            <div className="absolute w-20 h-20 rounded-full border border-orange-500/20 animate-ping opacity-60" />
            <div
              className="absolute w-24 h-24 rounded-full border border-orange-500/10 animate-ping opacity-40"
              style={{ animationDelay: "0.6s" }}
            />
            {/* Core sphere */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-600/30 via-orange-500/10 to-transparent backdrop-blur-xl border border-orange-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)]">
              <Zap className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            </div>
          </div>

          {/* Orbit ring */}
          <div className="absolute w-[430px] h-[430px] rounded-full border border-white/[0.04]" />

          {/* Nodes */}
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;
            const energy = item.energy || 50;

            const nodeStyle: React.CSSProperties = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => { nodeRefs.current[item.id] = el; }}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Pulse aura */}
                <div
                  className={`absolute rounded-full ${isPulsing ? "animate-pulse" : ""}`}
                  style={{
                    background: `radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0) 70%)`,
                    width: `${energy * 0.4 + 44}px`,
                    height: `${energy * 0.4 + 44}px`,
                    left: `-${(energy * 0.4 + 44 - 40) / 2}px`,
                    top: `-${(energy * 0.4 + 44 - 40) / 2}px`,
                  }}
                />

                {/* Node icon circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${
                      isExpanded
                        ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.6)]"
                        : isRelated
                        ? "bg-orange-500/30 text-orange-300"
                        : "bg-[#0a0a0a] text-white/60"
                    }
                    border-2 
                    ${
                      isExpanded
                        ? "border-orange-400"
                        : isRelated
                        ? "border-orange-500/50 animate-pulse"
                        : "border-white/10"
                    }
                    transition-all duration-300
                    ${isExpanded ? "scale-150" : ""}
                  `}
                >
                  <Icon size={16} />
                </div>

                {/* Node label */}
                <div
                  className={`
                    absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                    text-[10px] font-semibold tracking-wider uppercase
                    transition-all duration-300
                    ${isExpanded ? "text-orange-400 scale-125" : "text-white/50"}
                  `}
                >
                  {item.title}
                </div>

                {/* Expanded card */}
                {isExpanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-[#080808]/95 backdrop-blur-xl border-orange-500/20 shadow-[0_0_40px_rgba(249,115,22,0.15)] overflow-visible">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-orange-500/50" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
                    <CardHeader className="pb-2 p-4">
                      <div className="flex justify-between items-center">
                        <Badge className={`px-2 text-[10px] border ${getStatusBadgeClass(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </Badge>
                        <span className="text-[10px] font-mono text-white/30">
                          {item.date}
                        </span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/60 p-4 pt-0">
                      <p>{item.description}</p>

                      {/* Energy bar */}
                      <div className="mt-4 pt-3 border-t border-white/[0.06]">
                        <div className="flex justify-between items-center text-xs mb-1.5">
                          <span className="flex items-center gap-1 text-white/40">
                            <Zap size={9} className="text-orange-400" />
                            Completion
                          </span>
                          <span className="font-mono text-orange-400">{energy}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
                            style={{ width: `${energy}%` }}
                          />
                        </div>
                      </div>

                      {/* Related nodes */}
                      {item.relatedIds && item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center mb-2">
                            <Link size={9} className="text-white/30 mr-1" />
                            <h4 className="text-[10px] uppercase tracking-wider font-medium text-white/30">
                              Connected Nodes
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find((i) => i.id === relatedId);
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-6 px-2 py-0 text-[10px] rounded-md border-white/10 bg-transparent hover:bg-orange-500/10 hover:border-orange-500/30 text-white/50 hover:text-orange-300 transition-all"
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  {relatedItem?.title}
                                  <ArrowRight size={8} className="ml-1" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
