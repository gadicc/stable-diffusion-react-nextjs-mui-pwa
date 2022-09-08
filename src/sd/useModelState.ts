import React, { useMemo } from "react";

import defaults from "./defaults";

function useSdState<T>(initialValue: T) {
  const state = React.useState<T>(initialValue);
  return {
    value: state[0],
    set: state[1],
  };
}

export function modelStateValues(modelState) {
  return Object.fromEntries(
    Object.entries(modelState).map((key, state) => [key, state.value])
  );
}

export default function useModelState(inputs?: string[]) {
  const allStates = {
    prompt: useSdState(""),
    num_inference_steps: useSdState<number | string>(
      defaults.num_inference_steps
    ),
    guidance_scale: useSdState<number | string>(defaults.guidance_scale),
    width: useSdState<number | string>(defaults.width),
    height: useSdState<number | string>(defaults.height),
  };

  return allStates;

  return inputs
    ? Object.fromEntries(
        Object.entries(allStates).filter(([key]) => inputs.includes(key))
      )
    : allStates;
}