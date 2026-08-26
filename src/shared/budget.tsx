/**
 * The ethos, as something that can fail.
 *
 * "Spend the offset about twice per screen, and mean it both times. Three
 * levels of the same treatment is how a signal stops being one."
 *
 * That is the rule most likely to erode, because every individual violation is
 * reasonable — this card is important too, this button is the main action of
 * its section — and the erosion only shows up once as a screen where everything
 * is shouting. It is also the rule a component library can hold, which is more
 * than a document can do.
 *
 * So every edge-bearing component registers itself, and past the budget the
 * provider says so, once, in development. It never throws and never changes
 * what renders: an interface that refuses to draw because of a design rule is
 * worse than the rule being broken.
 *
 * This is also the closest thing here to a lint. `<InkBudget max={2}>` around a
 * screen turns "about twice" into a number somebody chose on purpose.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isDev, warnOnce } from "../core/env.js";

interface BudgetHandle {
  max: number;
  label: string;
  claim: () => () => void;
  /** Live count. Read by tests; not used for rendering. */
  spent: () => number;
}

const BudgetContext = createContext<BudgetHandle | null>(null);

export interface InkBudgetProps {
  /** How many raised surfaces this screen is allowed. Two, unless you can say why. */
  max?: number;
  /** Named in the warning, so it says which screen overspent. */
  label?: string;
  children: ReactNode;
}

export function InkBudget({ max = 2, label = "screen", children }: InkBudgetProps) {
  const count = useRef(0);
  const [, force] = useState(0);

  const handle = useMemo<BudgetHandle>(
    () => ({
      max,
      label,
      spent: () => count.current,
      claim: () => {
        count.current += 1;
        if (isDev() && count.current > max) {
          warnOnce(
            `${label} raises ${count.current} surfaces on the ink edge, over its budget of ${max}. ` +
              `State is elevation, so a screen with everything raised has nothing selected. ` +
              `Drop the extras to a hairline, or raise the budget deliberately.`,
          );
        }
        force((n) => n + 1);
        return () => {
          count.current -= 1;
          force((n) => n + 1);
        };
      },
    }),
    [max, label],
  );

  return <BudgetContext.Provider value={handle}>{children}</BudgetContext.Provider>;
}

/**
 * Called by every component that draws the edge.
 *
 * `active` is false for the unchosen state of a choice control, which is the
 * whole point: a row of twelve voices spends exactly one edge, not twelve.
 */
export function useEdgeBudget(active: boolean): void {
  const budget = useContext(BudgetContext);
  useEffect(() => {
    if (!active || !budget) return;
    return budget.claim();
  }, [active, budget]);
}

/** What the current subtree has spent. For tests and for a debug overlay. */
export function useInkBudget(): { spent: number; max: number } | null {
  const budget = useContext(BudgetContext);
  const [, force] = useState(0);
  useEffect(() => {
    force((n) => n + 1);
  }, []);
  if (!budget) return null;
  return { spent: budget.spent(), max: budget.max };
}
