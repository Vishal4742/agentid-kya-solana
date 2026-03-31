pub mod init_config;
pub mod log_action;
pub mod rate;
pub mod register;
pub mod update_capabilities;
pub mod update_reputation;
pub mod verify;
pub mod treasury_init;
pub mod treasury_payment;
pub mod treasury_update;
pub mod treasury_deposit;

// The #[program] macro requires glob re-exports so it can resolve all account
// structs from the `crate::instructions` namespace. The `ambiguous_glob_reexports`
// lint fires because multiple modules happen to export identically-named event/param
// structs, but none of those names actually conflict at the call sites used by Anchor.
#[allow(ambiguous_glob_reexports)]
pub use init_config::*;
#[allow(ambiguous_glob_reexports)]
pub use log_action::*;
#[allow(ambiguous_glob_reexports)]
pub use rate::*;
#[allow(ambiguous_glob_reexports)]
pub use register::*;
#[allow(ambiguous_glob_reexports)]
pub use update_capabilities::*;
#[allow(ambiguous_glob_reexports)]
pub use update_reputation::*;
#[allow(ambiguous_glob_reexports)]
pub use verify::*;
#[allow(ambiguous_glob_reexports)]
pub use treasury_init::*;
#[allow(ambiguous_glob_reexports)]
pub use treasury_payment::*;
#[allow(ambiguous_glob_reexports)]
pub use treasury_update::*;
#[allow(ambiguous_glob_reexports)]
pub use treasury_deposit::*;

