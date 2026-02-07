import { KnapsackItem } from '../data/knapsack';

export const calcSphereFitness = (genes: number[]): number => {
  return genes.reduce((acc, val) => acc + (val * val), 0);
};

export const calcKnapsackFitness = (genes: number[], items: KnapsackItem[], capacity: number): { fitness: number, weight: number, isValid: boolean } => {
  let totalValue = 0;
  let totalWeight = 0;
  
  genes.forEach((g, i) => {
    if (g === 1 && items[i]) {
      totalValue += items[i].value;
      totalWeight += items[i].weight;
    }
  });

  const isValid = totalWeight <= capacity;
  return { 
    fitness: isValid ? totalValue : 0, 
    weight: totalWeight, 
    isValid 
  };
};

export const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
