/**
 * Springs, for Animated.
 *
 * Everything a finger can interrupt moves on a spring rather than a timed
 * curve: a spring starts from wherever the value is now and carries the speed
 * it already had, so grabbing a sheet halfway down does not make it jump.
 */
import { Animated } from "react-native";
import { SPRING, springPhysics, type InkSpring } from "../tokens/motion.js";

export function springTo(
  value: Animated.Value,
  toValue: number,
  options: {
    spring?: InkSpring;
    velocity?: number;
    native?: boolean;
    /** How close counts as there, in the value's own units. 0.5 suits px; a 0..1 progress wants less. */
    rest?: number;
  } = {},
): Animated.CompositeAnimation {
  return Animated.spring(value, {
    toValue,
    // px/s. PanResponder reports px/ms, so a caller multiplies by 1000.
    velocity: options.velocity ?? 0,
    useNativeDriver: options.native ?? true,
    restDisplacementThreshold: options.rest ?? 0.5,
    restSpeedThreshold: options.rest ?? 0.5,
    ...springPhysics(options.spring ?? SPRING.default),
  });
}
