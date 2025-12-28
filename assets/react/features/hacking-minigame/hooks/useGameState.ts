import { useState, useCallback, useMemo } from 'react';
import { SeededRandom } from '../utils/seededRandom';
import { HexCoord, cubeToId, generateHexGrid, hexDistance, getNeighbors } from '../utils/hexMath';
import { NODE_STATS, DIFFICULTY_CONFIG, Difficulty, NodeType } from '../constants/nodeDefinitions';
import { GameState, GameNode, CombatResult, TargetingMode } from '../types';

function generateBoard(seed: string, difficulty: Difficulty): GameState {
  const rng = new SeededRandom(seed);
  const config = DIFFICULTY_CONFIG[difficulty];

  // Generate hex grid
  const hexes = generateHexGrid(config.gridRadius);
  const center: HexCoord = { q: 0, r: 0, s: 0 };

  // Place core based on difficulty (never at center):
  // - Easy/Normal: anywhere except center (dist 1 to radius)
  // - Hard: at least 2 away from center, not at edge
  let coreHexes: HexCoord[];
  if (difficulty === 'hard') {
    coreHexes = hexes.filter(h => {
      const dist = hexDistance(h, center);
      return dist >= 2 && dist < config.gridRadius;
    });
  } else {
    // Easy and Normal: anywhere except center
    coreHexes = hexes.filter(h => hexDistance(h, center) >= 1);
  }
  const core = rng.pick(coreHexes);
  console.log(
    '[HackingMinigame] difficulty:',
    difficulty,
    'gridRadius:',
    config.gridRadius,
    'coreHexes count:',
    coreHexes.length,
    'selected core:',
    core,
  );

  // Place start position at random edge, preferring positions far from core
  const edgeHexes = hexes.filter(h => hexDistance(h, center) === config.gridRadius);
  const sortedEdges = [...edgeHexes].sort((a, b) => hexDistance(b, core) - hexDistance(a, core));
  const farthestEdges = sortedEdges.slice(0, Math.max(3, Math.floor(sortedEdges.length / 2)));
  const start = rng.pick(farthestEdges);

  // Create nodes map
  const nodes = new Map<string, GameNode>();

  // Place all hexes as unexplored empty initially
  hexes.forEach(hex => {
    const id = cubeToId(hex);
    nodes.set(id, {
      id,
      ...hex,
      type: 'empty',
      state: 'unexplored',
      coherence: 0,
      maxCoherence: 0,
    });
  });

  // Place core
  const coreId = cubeToId(core);
  nodes.set(coreId, {
    id: coreId,
    ...core,
    type: 'core',
    state: 'unexplored',
    coherence: config.coreCoherence,
    maxCoherence: config.coreCoherence,
  });

  // Place start (explored)
  const startId = cubeToId(start);
  nodes.set(startId, {
    id: startId,
    ...start,
    type: 'empty',
    state: 'explored',
    coherence: 0,
    maxCoherence: 0,
    distanceHint: hexDistance(start, core),
  });

  // Get available hexes for placing nodes (not core, not start)
  const availableHexes = hexes.filter(h => cubeToId(h) !== coreId && cubeToId(h) !== startId);
  const shuffled = rng.shuffle(availableHexes);

  // Place defensive nodes
  const defensiveTypes: NodeType[] = ['firewall', 'antivirus', 'restoration', 'suppressor'];
  let nodeIndex = 0;

  for (let i = 0; i < config.defensiveCount && nodeIndex < shuffled.length; i++) {
    const hex = shuffled[nodeIndex++];
    const type = rng.pick(defensiveTypes);
    const stats = NODE_STATS[type];
    const id = cubeToId(hex);
    nodes.set(id, {
      id,
      ...hex,
      type,
      state: 'unexplored',
      coherence: stats.coherence,
      maxCoherence: stats.coherence,
    });
  }

  // Place data caches
  for (let i = 0; i < config.cacheCount && nodeIndex < shuffled.length; i++) {
    const hex = shuffled[nodeIndex++];
    const id = cubeToId(hex);
    nodes.set(id, {
      id,
      ...hex,
      type: 'data_cache',
      state: 'unexplored',
      coherence: NODE_STATS.data_cache.coherence,
      maxCoherence: NODE_STATS.data_cache.coherence,
    });
  }

  // Calculate distance hints for empty nodes
  nodes.forEach((node, id) => {
    if (node.type === 'empty' && node.state !== 'explored') {
      // Find minimum distance to core or any defensive node
      let minDist = hexDistance(node, core);
      nodes.forEach(other => {
        if (NODE_STATS[other.type].isDefensive) {
          const dist = hexDistance(node, other);
          minDist = Math.min(minDist, dist);
        }
      });
      node.distanceHint = Math.min(5, Math.max(1, minDist));
    }
  });

  // Mark nodes adjacent to start as 'adjacent'
  markAdjacentNodes(startId, nodes);

  return {
    phase: 'intro',
    virusCoherence: config.virusCoherence,
    maxVirusCoherence: config.virusCoherence,
    virusStrength: config.virusStrength,
    baseVirusStrength: config.virusStrength,
    turnCount: 0,
    nodes,
    corePosition: core,
    startPosition: start,
    utilities: {
      selfRepairs: 0,
      kernelRots: 0,
      polymorphicShields: 0,
      secondaryVectors: 0,
    },
    buffs: {
      shieldCharges: 0,
    },
    healOverTime: { turnsRemaining: 0, healPerTurn: 0 },
    activeDoTs: {},
    targetingMode: 'none' as TargetingMode,
    difficulty,
    combatLog: [],
  };
}

function markAdjacentNodes(exploredId: string, nodes: Map<string, GameNode>) {
  const explored = nodes.get(exploredId);
  if (!explored) return;

  const neighbors = getNeighbors(explored);
  neighbors.forEach(neighbor => {
    const neighborId = cubeToId(neighbor);
    const node = nodes.get(neighborId);
    if (node && node.state === 'unexplored') {
      node.state = 'adjacent';
    }
  });
}

interface CacheResult {
  lootedUtility?: NodeType;
  spawnedEnemy?: NodeType;
}

function resolveCombat(virusStrength: number, node: GameNode, hasShield: boolean, rng: SeededRandom): CombatResult {
  const stats = NODE_STATS[node.type];
  const log: string[] = [];

  // Virus attacks first
  const nodeDamage = virusStrength;
  const newNodeCoherence = node.coherence - nodeDamage;
  log.push(`Virus deals ${nodeDamage} damage to ${node.type}`);

  // Node counter-attacks if still alive
  let virusDamage = 0;
  if (newNodeCoherence > 0) {
    if (hasShield) {
      log.push('Polymorphic Shield absorbs the attack!');
    } else {
      virusDamage = stats.attack;
      log.push(`${node.type} deals ${virusDamage} damage to virus`);
    }
  }
  // Destruction messages are handled per-node-type in clickNode

  // Check for loot/trap from data cache
  let lootedUtility: NodeType | undefined;
  if (node.type === 'data_cache' && newNodeCoherence <= 0) {
    const roll = rng.next();
    if (roll < 0.5) {
      // 50% chance for utility
      const utilityTypes: NodeType[] = ['self_repair', 'kernel_rot', 'polymorphic_shield', 'secondary_vector'];
      lootedUtility = rng.pick(utilityTypes);
      log.push(`Found ${lootedUtility.replace(/_/g, ' ')}!`);
    } else if (roll < 0.8) {
      // 30% chance empty
      log.push('Cache was empty...');
    } else {
      // 20% chance trap - spawn enemy (handled by caller via spawnedEnemy in result)
      const trapTypes: NodeType[] = ['antivirus', 'firewall'];
      lootedUtility = rng.pick(trapTypes); // Repurpose lootedUtility for trap spawn
      log.push(`TRAP! ${lootedUtility} emerged from cache!`);
    }
  }

  return {
    virusDamage,
    nodeDamage,
    nodeDestroyed: newNodeCoherence <= 0,
    virusDestroyed: false, // Will be calculated by caller
    log,
    lootedUtility,
  };
}

export function useGameState(seed: string, difficulty: Difficulty) {
  const rng = useMemo(() => new SeededRandom(seed + '_actions'), [seed]);

  const [gameState, setGameState] = useState<GameState>(() => generateBoard(seed, difficulty));

  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      phase: 'playing',
      combatLog: ['Hack initiated. Find and destroy the System Core.'],
    }));
  }, []);

  const resetGame = useCallback(() => {
    setGameState(generateBoard(seed, difficulty));
  }, [seed, difficulty]);

  // Helper to count active suppressors (only revealed ones apply penalty)
  const countActiveSuppressors = useCallback((nodes: Map<string, GameNode>): number => {
    let count = 0;
    nodes.forEach(node => {
      // Only count suppressors that have been revealed - adjacent (hidden as "?") shouldn't apply penalty
      if (node.type === 'suppressor' && node.state === 'revealed') {
        count++;
      }
    });
    return count;
  }, []);

  const clickNode = useCallback(
    (nodeId: string) => {
      setGameState(prev => {
        if (prev.phase !== 'playing') return prev;

        // Handle targeting mode for Secondary Vector / Kernel Rot
        if (prev.targetingMode === 'secondary_vector' || prev.targetingMode === 'kernel_rot') {
          const targetNode = prev.nodes.get(nodeId);
          // Can only target revealed defensive nodes
          if (!targetNode || targetNode.state !== 'revealed') {
            return prev; // Invalid target - must be revealed first
          }
          if (!NODE_STATS[targetNode.type].isDefensive) {
            return prev; // Can only target defensive nodes
          }

          const newNodes = new Map(prev.nodes);
          const newActiveDoTs = { ...prev.activeDoTs };
          const newUtilities = { ...prev.utilities };
          let newLog = [...prev.combatLog];

          if (prev.targetingMode === 'secondary_vector') {
            // Apply DoT to target
            newActiveDoTs[nodeId] = { turnsRemaining: 3, damagePerTurn: 20 };
            newLog.push(`Secondary Vector applied to ${targetNode.type}! 20 damage/turn for 3 turns.`);
          } else if (prev.targetingMode === 'kernel_rot') {
            // Apply Kernel Rot
            const newTarget = { ...targetNode };
            newTarget.coherence = Math.floor(newTarget.coherence / 2);
            newNodes.set(nodeId, newTarget);
            newLog.push(`Kernel Rot halved ${targetNode.type}'s coherence!`);
          }

          return {
            ...prev,
            nodes: newNodes,
            activeDoTs: newActiveDoTs,
            utilities: newUtilities,
            targetingMode: 'none',
            combatLog: newLog.slice(-10),
          };
        }

        const node = prev.nodes.get(nodeId);
        // Allow clicking adjacent (to reveal) or revealed (to attack)
        if (!node || (node.state !== 'adjacent' && node.state !== 'revealed')) return prev;

        const newNodes = new Map(prev.nodes);
        const newNode = { ...node };
        newNodes.set(nodeId, newNode);

        let newVirusCoherence = prev.virusCoherence;
        const newUtilities = { ...prev.utilities };
        const newBuffs = { ...prev.buffs };
        let newHealOverTime = { ...prev.healOverTime };
        let newActiveDoTs = { ...prev.activeDoTs };
        let newLog = [...prev.combatLog];
        let phase = prev.phase;

        // Calculate effective attack strength (suppressor debuff while alive)
        const activeSuppressors = countActiveSuppressors(newNodes);
        const suppressorPenalty = activeSuppressors * 10;
        const effectiveStrength = Math.max(5, prev.baseVirusStrength - suppressorPenalty);

        // Check if clicking on a utility to collect it
        if (NODE_STATS[node.type].isUtility) {
          // Collect the utility
          switch (node.type) {
            case 'self_repair':
              newUtilities.selfRepairs++;
              newLog.push('Collected Self Repair!');
              break;
            case 'kernel_rot':
              newUtilities.kernelRots++;
              newLog.push('Collected Kernel Rot!');
              break;
            case 'polymorphic_shield':
              newUtilities.polymorphicShields++;
              newLog.push('Collected Polymorphic Shield!');
              break;
            case 'secondary_vector':
              newUtilities.secondaryVectors++;
              newLog.push('Collected Secondary Vector!');
              break;
          }
          newNode.state = 'destroyed';
          markAdjacentNodes(nodeId, newNodes);
        } else if (node.state === 'adjacent' && (NODE_STATS[node.type].isDefensive || node.type === 'data_cache')) {
          // First click on defensive/cache node - REVEAL only (no combat)
          newNode.state = 'revealed';
          const typeName = node.type.replace(/_/g, ' ');
          newLog.push(`Revealed: ${typeName}`);
          // No combat, no markAdjacentNodes - just reveal
        } else if (node.state === 'revealed') {
          // Second click - ATTACK!
          const hasShield = newBuffs.shieldCharges > 0;
          const result = resolveCombat(effectiveStrength, node, hasShield, rng);

          newLog = [...newLog, ...result.log];

          if (hasShield && result.virusDamage > 0) {
            newBuffs.shieldCharges--;
          } else {
            newVirusCoherence -= result.virusDamage;
          }

          // Special handling for data_cache - always transform on first attack
          if (node.type === 'data_cache') {
            // Roll for what's inside the cache (only if not already rolled during combat)
            let cacheResult = result.lootedUtility;
            if (!result.nodeDestroyed) {
              // Cache survived - still need to roll for transformation
              const roll = rng.next();
              if (roll < 0.5) {
                // 50% chance for utility
                const utilityTypes: NodeType[] = [
                  'self_repair',
                  'kernel_rot',
                  'polymorphic_shield',
                  'secondary_vector',
                ];
                cacheResult = rng.pick(utilityTypes);
                newLog.push(`Found ${cacheResult.replace(/_/g, ' ')}!`);
              } else if (roll < 0.8) {
                // 30% chance empty
                cacheResult = undefined;
                newLog.push('Cache was empty...');
              } else {
                // 20% chance trap - spawn enemy
                const trapTypes: NodeType[] = ['antivirus', 'firewall'];
                cacheResult = rng.pick(trapTypes);
                newLog.push(`TRAP! ${cacheResult} emerged from cache!`);
              }
            }

            // Transform the cache based on roll result
            if (cacheResult) {
              // Check if it's a trap (enemy spawn) or utility
              if (cacheResult === 'antivirus' || cacheResult === 'firewall') {
                // Trap! Replace with an enemy at full health
                const trapStats = NODE_STATS[cacheResult];
                newNode.type = cacheResult;
                newNode.state = 'revealed'; // Already revealed, can attack immediately
                newNode.coherence = trapStats.coherence;
                newNode.maxCoherence = trapStats.coherence;
              } else {
                // Utility loot - place it on the grid, user must click to collect
                newNode.type = cacheResult;
                newNode.state = 'adjacent'; // Clickable to collect
                newNode.coherence = 0;
                newNode.maxCoherence = 0;
              }
            } else {
              // Empty cache - mark as explored
              newNode.type = 'empty';
              newNode.state = 'explored';
              newNode.coherence = 0;
              newNode.maxCoherence = 0;
            }
            // Mark adjacent regardless of result
            markAdjacentNodes(nodeId, newNodes);
          } else if (result.nodeDestroyed) {
            newNode.state = 'destroyed';
            newNode.coherence = 0;

            // Remove any DoT on this destroyed node
            delete newActiveDoTs[nodeId];

            // Node-type-specific destruction effects
            switch (node.type) {
              case 'core':
                phase = 'won';
                newLog.push('SYSTEM CORE DESTROYED! Access granted.');
                break;

              case 'suppressor':
                // Suppressor destroyed - attack penalty removed
                const remainingSuppressors = countActiveSuppressors(newNodes) - 1; // -1 because we just destroyed one
                if (remainingSuppressors > 0) {
                  newLog.push(`Suppressor destroyed! ${remainingSuppressors} suppressor(s) still active.`);
                } else {
                  newLog.push('Suppressor destroyed! Attack strength restored.');
                }
                markAdjacentNodes(nodeId, newNodes);
                break;

              case 'restoration':
                // Restoration destroyed - stops healing nearby nodes
                newLog.push('Restoration node destroyed! Nearby healing stopped.');
                markAdjacentNodes(nodeId, newNodes);
                break;

              case 'firewall':
                newLog.push('Firewall breached!');
                markAdjacentNodes(nodeId, newNodes);
                break;

              case 'antivirus':
                newLog.push('Anti-virus eliminated!');
                markAdjacentNodes(nodeId, newNodes);
                break;

              default:
                markAdjacentNodes(nodeId, newNodes);
                break;
            }
          } else {
            // Node survived - keep it revealed so player can attack again
            newNode.state = 'revealed';
            newNode.coherence = node.coherence - result.nodeDamage;
          }

          // Check for virus death
          if (newVirusCoherence <= 0) {
            phase = 'lost';
            newLog.push('Virus coherence depleted! Hack failed.');
          }
        } else {
          // Empty node - just explore it
          newNode.state = 'explored';
          newLog.push(`Explored empty node. Distance hint: ${newNode.distanceHint || '?'}`);
          markAdjacentNodes(nodeId, newNodes);
        }

        // === END OF TURN EFFECTS ===

        // Process Heal Over Time (Self Repair)
        if (newHealOverTime.turnsRemaining > 0 && phase === 'playing') {
          newVirusCoherence = Math.min(prev.maxVirusCoherence, newVirusCoherence + newHealOverTime.healPerTurn);
          newLog.push(`Self Repair heals ${newHealOverTime.healPerTurn} coherence.`);
          newHealOverTime = {
            ...newHealOverTime,
            turnsRemaining: newHealOverTime.turnsRemaining - 1,
          };
          if (newHealOverTime.turnsRemaining === 0) {
            newLog.push('Self Repair effect expired.');
          }
        }

        // Process Damage Over Time (Secondary Vector)
        if (phase === 'playing') {
          const expiredDoTs: string[] = [];
          Object.entries(newActiveDoTs).forEach(([targetId, dot]) => {
            const target = newNodes.get(targetId);
            if (target && target.state !== 'destroyed') {
              const newTarget = { ...target };
              newTarget.coherence = Math.max(0, newTarget.coherence - dot.damagePerTurn);
              newNodes.set(targetId, newTarget);
              newLog.push(`Secondary Vector deals ${dot.damagePerTurn} to ${newTarget.type}.`);

              if (newTarget.coherence <= 0) {
                newTarget.state = 'destroyed';
                newLog.push(`${newTarget.type} destroyed by Secondary Vector!`);
                markAdjacentNodes(targetId, newNodes);

                // Check if DoT killed the core
                if (newTarget.type === 'core') {
                  phase = 'won';
                  newLog.push('SYSTEM CORE DESTROYED! Access granted.');
                }
                expiredDoTs.push(targetId);
              } else {
                // Tick down DoT
                newActiveDoTs[targetId] = {
                  ...dot,
                  turnsRemaining: dot.turnsRemaining - 1,
                };
                if (newActiveDoTs[targetId].turnsRemaining <= 0) {
                  expiredDoTs.push(targetId);
                }
              }
            } else {
              expiredDoTs.push(targetId);
            }
          });
          expiredDoTs.forEach(id => delete newActiveDoTs[id]);
        }

        // Handle restoration nodes healing ALL revealed defensive nodes
        if (phase === 'playing') {
          // Collect all active restoration nodes (only revealed ones are active)
          const activeRestorations: GameNode[] = [];
          newNodes.forEach(n => {
            if (n.type === 'restoration' && n.state === 'revealed') {
              activeRestorations.push(n);
            }
          });

          // Each restoration heals ALL other revealed defensive nodes
          activeRestorations.forEach(restoration => {
            const healAmount = NODE_STATS.restoration.attack;
            const healedNodes: string[] = [];

            newNodes.forEach((target, targetId) => {
              // Heal all revealed defensive nodes (except the restoration itself)
              // Can overheal beyond max coherence
              if (
                target.id !== restoration.id &&
                NODE_STATS[target.type].isDefensive &&
                target.state === 'revealed'
              ) {
                // Create a new object to ensure React detects the state change
                const healedTarget = { ...target };
                healedTarget.coherence = target.coherence + healAmount;
                newNodes.set(targetId, healedTarget);
                healedNodes.push(target.type);
              }
            });

            if (healedNodes.length > 0) {
              newLog.push(`Restoration healed ${healedNodes.length} node(s) for +${healAmount} each.`);
            }
          });
        }

        return {
          ...prev,
          nodes: newNodes,
          virusCoherence: newVirusCoherence,
          utilities: newUtilities,
          buffs: newBuffs,
          healOverTime: newHealOverTime,
          activeDoTs: newActiveDoTs,
          turnCount: prev.turnCount + 1,
          phase,
          combatLog: newLog.slice(-10), // Keep last 10 entries
          lastAction: nodeId,
        };
      });
    },
    [rng, countActiveSuppressors],
  );

  const useUtility = useCallback(
    (utility: 'selfRepairs' | 'kernelRots' | 'polymorphicShields' | 'secondaryVectors') => {
      setGameState(prev => {
        if (prev.phase !== 'playing') return prev;
        if (prev.utilities[utility] <= 0) return prev;

        const newUtilities = { ...prev.utilities };
        const newBuffs = { ...prev.buffs };
        let newHealOverTime = { ...prev.healOverTime };
        let newTargetingMode: TargetingMode = prev.targetingMode;
        let newLog = [...prev.combatLog];

        switch (utility) {
          case 'selfRepairs':
            // HoT: 10 HP per turn for 3 turns
            newUtilities[utility]--;
            newHealOverTime = { turnsRemaining: 3, healPerTurn: 10 };
            newLog.push('Self Repair activated! +10 coherence per turn for 3 turns.');
            break;
          case 'kernelRots':
            // Enter targeting mode - click a defensive node to halve its coherence
            newUtilities[utility]--;
            newTargetingMode = 'kernel_rot';
            newLog.push('Kernel Rot ready - click a defensive node to halve its coherence.');
            break;
          case 'polymorphicShields':
            newUtilities[utility]--;
            newBuffs.shieldCharges += 2;
            newLog.push('Polymorphic Shield activated. Next 2 attacks nullified.');
            break;
          case 'secondaryVectors':
            // Enter targeting mode - click a defensive node to apply DoT
            newUtilities[utility]--;
            newTargetingMode = 'secondary_vector';
            newLog.push('Secondary Vector ready - click a defensive node to apply DoT.');
            break;
        }

        return {
          ...prev,
          utilities: newUtilities,
          buffs: newBuffs,
          healOverTime: newHealOverTime,
          targetingMode: newTargetingMode,
          combatLog: newLog.slice(-10),
        };
      });
    },
    [],
  );

  const cancelTargeting = useCallback(() => {
    setGameState(prev => {
      if (prev.targetingMode === 'none') return prev;

      // Refund the utility
      const newUtilities = { ...prev.utilities };
      if (prev.targetingMode === 'secondary_vector') {
        newUtilities.secondaryVectors++;
      } else if (prev.targetingMode === 'kernel_rot') {
        newUtilities.kernelRots++;
      }

      return {
        ...prev,
        utilities: newUtilities,
        targetingMode: 'none',
        combatLog: [...prev.combatLog, 'Targeting cancelled.'].slice(-10),
      };
    });
  }, []);

  return {
    gameState,
    startGame,
    resetGame,
    clickNode,
    useUtility,
    cancelTargeting,
  };
}
