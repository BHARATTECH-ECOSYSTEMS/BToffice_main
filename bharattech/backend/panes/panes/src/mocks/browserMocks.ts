export const mockCheckDependencies = () => {
  return {
    node: { found: true },
    codex: { found: true },
  };
};

export const mockEngineHealth = () => {
  return {
    codex: {
      available: true,
      details: "Mocked - running in browser",
    },
  };
};

export const mockListEngines = () => {
  return [
    {
      id: "codex",
      models: [
        { id: "default", hidden: false, isDefault: true },
      ],
    },
  ];
};