/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/agentid_program.json`.
 */
export type AgentidProgram = {
  "address": "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF",
  "metadata": {
    "name": "agentidProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "autonomousPayment",
      "docs": [
        "Execute an autonomous USDC payment via the agent's treasury"
      ],
      "discriminator": [
        88,
        46,
        9,
        90,
        148,
        71,
        4,
        217
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "agentWallet",
          "signer": true
        },
        {
          "name": "owner",
          "relations": [
            "treasury",
            "agentIdentity"
          ]
        },
        {
          "name": "treasuryUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "recipientUsdc",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "recipient",
          "type": "pubkey"
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "deposit",
      "docs": [
        "Deposit USDC into the treasury"
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "depositor",
          "writable": true,
          "signer": true
        },
        {
          "name": "depositorUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "depositor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "treasuryUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "emergencyPause",
      "docs": [
        "Emergency pause for the treasury (Owner only)"
      ],
      "discriminator": [
        21,
        143,
        27,
        142,
        200,
        181,
        210,
        255
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "treasury"
          ]
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "initConfig",
      "docs": [
        "Initialize the global program configuration (e.g., oracle authority)"
      ],
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "oracle"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initializeTreasury",
      "docs": [
        "Initialize a newly created AgentTreasury PDA for an agent"
      ],
      "discriminator": [
        124,
        186,
        211,
        195,
        85,
        165,
        129,
        166
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "agentIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "agentIdentity"
          ]
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "spendingLimitPerTx",
          "type": "u64"
        },
        {
          "name": "spendingLimitPerDay",
          "type": "u64"
        },
        {
          "name": "multisigRequiredAbove",
          "type": "u64"
        }
      ]
    },
    {
      "name": "logAction",
      "docs": [
        "Log an on-chain action performed by the agent.",
        "Creates an AgentAction PDA and updates identity stats."
      ],
      "discriminator": [
        123,
        192,
        243,
        96,
        38,
        250,
        134,
        135
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "action",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "identity"
              },
              {
                "kind": "account",
                "path": "identity.total_transactions",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "logActionParams"
            }
          }
        }
      ]
    },
    {
      "name": "rateAgent",
      "docs": [
        "Rate an agent (1–5 stars). Rater cannot be the agent owner."
      ],
      "discriminator": [
        62,
        30,
        240,
        125,
        81,
        120,
        134,
        78
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "rater",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "rating",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerAgent",
      "docs": [
        "Register a new AI agent identity on-chain.",
        "Creates an AgentIdentity PDA seeded by [b\"agent-identity\", owner.key()]."
      ],
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "registerAgentParams"
            }
          }
        }
      ]
    },
    {
      "name": "updateCapabilities",
      "docs": [
        "Update the agent's capabilities (DeFi trading, payments, limits).",
        "Requires owner signature."
      ],
      "discriminator": [
        102,
        104,
        235,
        240,
        127,
        163,
        100,
        149
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateCapabilitiesParams"
            }
          }
        }
      ]
    },
    {
      "name": "updateReputation",
      "discriminator": [
        194,
        220,
        43,
        201,
        54,
        209,
        49,
        178
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "config",
          "docs": [
            "Oracle authority must sign this instruction"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "oracle",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "newScore",
          "type": "u16"
        }
      ]
    },
    {
      "name": "updateSpendingLimits",
      "docs": [
        "Update the treasury's operational limits (Owner only)"
      ],
      "discriminator": [
        199,
        114,
        118,
        214,
        149,
        133,
        82,
        132
      ],
      "accounts": [
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "treasury"
          ]
        }
      ],
      "args": [
        {
          "name": "spendingLimitPerTx",
          "type": "u64"
        },
        {
          "name": "spendingLimitPerDay",
          "type": "u64"
        },
        {
          "name": "multisigRequiredAbove",
          "type": "u64"
        }
      ]
    },
    {
      "name": "verifyAgent",
      "docs": [
        "Verify an agent for a specific action type.",
        "Returns whether the agent is authorized based on reputation thresholds.",
        "CPI-callable by DeFi protocols."
      ],
      "discriminator": [
        206,
        212,
        108,
        12,
        105,
        61,
        100,
        66
      ],
      "accounts": [
        {
          "name": "identity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "actionType",
          "type": "u8"
        }
      ],
      "returns": {
        "defined": {
          "name": "verificationResult"
        }
      }
    }
  ],
  "accounts": [
    {
      "name": "agentAction",
      "discriminator": [
        60,
        172,
        111,
        6,
        139,
        162,
        215,
        12
      ]
    },
    {
      "name": "agentIdentity",
      "discriminator": [
        11,
        149,
        31,
        27,
        186,
        76,
        241,
        72
      ]
    },
    {
      "name": "agentTreasury",
      "discriminator": [
        129,
        97,
        0,
        63,
        102,
        222,
        200,
        166
      ]
    },
    {
      "name": "programConfig",
      "discriminator": [
        196,
        210,
        90,
        231,
        144,
        149,
        140,
        63
      ]
    }
  ],
  "events": [
    {
      "name": "agentRated",
      "discriminator": [
        116,
        96,
        76,
        234,
        149,
        184,
        152,
        63
      ]
    },
    {
      "name": "agentRegistered",
      "discriminator": [
        191,
        78,
        217,
        54,
        232,
        100,
        189,
        85
      ]
    },
    {
      "name": "capabilitiesUpdated",
      "discriminator": [
        238,
        187,
        138,
        145,
        174,
        93,
        144,
        113
      ]
    },
    {
      "name": "paymentExecuted",
      "discriminator": [
        153,
        165,
        141,
        18,
        246,
        20,
        204,
        227
      ]
    },
    {
      "name": "reputationUpdated",
      "discriminator": [
        26,
        36,
        187,
        150,
        235,
        90,
        106,
        89
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidNameLength",
      "msg": "Agent name must be between 3 and 64 characters"
    },
    {
      "code": 6001,
      "name": "insufficientReputation",
      "msg": "Reputation threshold not met for this action type"
    },
    {
      "code": 6002,
      "name": "insufficientVerification",
      "msg": "Agent is not verified at the required level"
    },
    {
      "code": 6003,
      "name": "invalidRating",
      "msg": "Rating must be between 1 and 5"
    },
    {
      "code": 6004,
      "name": "cannotRateSelf",
      "msg": "An agent cannot rate themselves"
    },
    {
      "code": 6005,
      "name": "capabilityNotEnabled",
      "msg": "Action type is not enabled for this agent"
    },
    {
      "code": 6006,
      "name": "exceedsMaxTxLimit",
      "msg": "Transaction exceeds agent's max USDC limit"
    },
    {
      "code": 6007,
      "name": "unauthorizedOracle",
      "msg": "Only the oracle authority can update reputation"
    },
    {
      "code": 6008,
      "name": "invalidReputationScore",
      "msg": "Reputation score must be between 0 and 1000"
    },
    {
      "code": 6009,
      "name": "invalidGstin",
      "msg": "GSTIN must be exactly 15 characters (leave blank to skip)"
    },
    {
      "code": 6010,
      "name": "treasuryPaused",
      "msg": "Treasury is paused for emergency"
    },
    {
      "code": 6011,
      "name": "exceedsPerTxLimit",
      "msg": "Payment amount exceeds per-transaction limit"
    },
    {
      "code": 6012,
      "name": "exceedsDailyLimit",
      "msg": "Payment amount exceeds daily spending limit"
    },
    {
      "code": 6013,
      "name": "requiresMultisig",
      "msg": "Transaction amount requires multisig approval"
    },
    {
      "code": 6014,
      "name": "unauthorizedTreasuryOwner",
      "msg": "Only the treasury owner can perform this action"
    },
    {
      "code": 6015,
      "name": "invalidRecipient",
      "msg": "Recipient does not match the provided token account owner"
    },
    {
      "code": 6016,
      "name": "arithmeticError",
      "msg": "Arithmetic overflow or underflow"
    }
  ],
  "types": [
    {
      "name": "agentAction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdentity",
            "type": "pubkey"
          },
          {
            "name": "actionType",
            "type": "u8"
          },
          {
            "name": "programCalled",
            "type": "pubkey"
          },
          {
            "name": "success",
            "type": "bool"
          },
          {
            "name": "usdcTransferred",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "memo",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentIdentity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentId",
            "docs": [
              "Unique hash of (owner + name + registered_at)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "owner",
            "docs": [
              "The wallet that registered this agent (signs owner-gated ix)"
            ],
            "type": "pubkey"
          },
          {
            "name": "agentWallet",
            "docs": [
              "The agent's operational wallet (may differ from owner)"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Human-readable agent name (max 64 chars)"
            ],
            "type": "string"
          },
          {
            "name": "framework",
            "docs": [
              "AI framework enum: 0=ELIZA 1=AutoGen 2=CrewAI 3=LangGraph 4=Custom"
            ],
            "type": "u8"
          },
          {
            "name": "model",
            "docs": [
              "LLM model name (max 32 chars)"
            ],
            "type": "string"
          },
          {
            "name": "credentialNft",
            "docs": [
              "Pubkey of the soulbound cNFT credential (set after Metaplex mint)"
            ],
            "type": "pubkey"
          },
          {
            "name": "verifiedLevel",
            "docs": [
              "0=Unverified 1=EmailVerified 2=KYBVerified 3=Audited"
            ],
            "type": "u8"
          },
          {
            "name": "registeredAt",
            "docs": [
              "Unix timestamp of registration"
            ],
            "type": "i64"
          },
          {
            "name": "lastActive",
            "docs": [
              "Last active timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "canTradeDefi",
            "type": "bool"
          },
          {
            "name": "canSendPayments",
            "type": "bool"
          },
          {
            "name": "canPublishContent",
            "type": "bool"
          },
          {
            "name": "canAnalyzeData",
            "type": "bool"
          },
          {
            "name": "maxTxSizeUsdc",
            "docs": [
              "Max USDC per transaction (in USDC lamports, 6 decimals)"
            ],
            "type": "u64"
          },
          {
            "name": "reputationScore",
            "docs": [
              "0–1000 reputation score (oracle-updated)"
            ],
            "type": "u16"
          },
          {
            "name": "totalTransactions",
            "type": "u64"
          },
          {
            "name": "successfulTransactions",
            "type": "u64"
          },
          {
            "name": "humanRatingX10",
            "docs": [
              "Rolling average human rating (1–50, divide by 10 for display)"
            ],
            "type": "u16"
          },
          {
            "name": "ratingCount",
            "type": "u32"
          },
          {
            "name": "gstin",
            "docs": [
              "GSTIN (max 15 chars): format 22AAAAA0000A1Z5"
            ],
            "type": "string"
          },
          {
            "name": "panHash",
            "docs": [
              "SHA-256 hash of PAN (never store raw PAN on-chain)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "serviceCategory",
            "docs": [
              "TDS service category: 0=IT 1=Finance 2=Consulting 3=Marketing 4=RnD"
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentRated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdentity",
            "type": "pubkey"
          },
          {
            "name": "rater",
            "type": "pubkey"
          },
          {
            "name": "rating",
            "type": "u8"
          },
          {
            "name": "newAvgX10",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "agentRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agentId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "registeredAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "agentTreasury",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdentity",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "usdcBalance",
            "type": "u64"
          },
          {
            "name": "totalEarned",
            "type": "u64"
          },
          {
            "name": "totalSpent",
            "type": "u64"
          },
          {
            "name": "spendingLimitPerTx",
            "type": "u64"
          },
          {
            "name": "spendingLimitPerDay",
            "type": "u64"
          },
          {
            "name": "spentToday",
            "type": "u64"
          },
          {
            "name": "dayResetTimestamp",
            "type": "i64"
          },
          {
            "name": "emergencyPause",
            "type": "bool"
          },
          {
            "name": "multisigRequiredAbove",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "capabilitiesUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "canTradeDefi",
            "type": "bool"
          },
          {
            "name": "canSendPayments",
            "type": "bool"
          },
          {
            "name": "canPublishContent",
            "type": "bool"
          },
          {
            "name": "canAnalyzeData",
            "type": "bool"
          },
          {
            "name": "maxTxSizeUsdc",
            "type": "u64"
          },
          {
            "name": "updatedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "logActionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "actionType",
            "type": "u8"
          },
          {
            "name": "programCalled",
            "type": "pubkey"
          },
          {
            "name": "success",
            "type": "bool"
          },
          {
            "name": "usdcTransferred",
            "type": "u64"
          },
          {
            "name": "memo",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "paymentExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agentIdentity",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "memo",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "programConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "oracleAuthority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "registerAgentParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "framework",
            "type": "u8"
          },
          {
            "name": "model",
            "type": "string"
          },
          {
            "name": "agentWallet",
            "type": "pubkey"
          },
          {
            "name": "canTradeDefi",
            "type": "bool"
          },
          {
            "name": "canSendPayments",
            "type": "bool"
          },
          {
            "name": "canPublishContent",
            "type": "bool"
          },
          {
            "name": "canAnalyzeData",
            "type": "bool"
          },
          {
            "name": "maxTxSizeUsdc",
            "type": "u64"
          },
          {
            "name": "gstin",
            "type": "string"
          },
          {
            "name": "panHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "serviceCategory",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "reputationUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "oldScore",
            "type": "u16"
          },
          {
            "name": "newScore",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "updateCapabilitiesParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "canTradeDefi",
            "type": "bool"
          },
          {
            "name": "canSendPayments",
            "type": "bool"
          },
          {
            "name": "canPublishContent",
            "type": "bool"
          },
          {
            "name": "canAnalyzeData",
            "type": "bool"
          },
          {
            "name": "maxTxSizeUsdc",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "verificationResult",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isRegistered",
            "type": "bool"
          },
          {
            "name": "verifiedLevel",
            "type": "u8"
          },
          {
            "name": "reputationScore",
            "type": "u16"
          },
          {
            "name": "isAuthorized",
            "type": "bool"
          },
          {
            "name": "agentName",
            "type": "string"
          }
        ]
      }
    }
  ]
};
