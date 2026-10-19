use std::{error::Error, fmt};

#[derive(Clone, Copy, PartialEq)]
pub enum State {
    Yellow,
    Red,
    None,
}
pub type Grid = [[State; 7]; 6];
pub trait GridTrait {
    fn new() -> Self;
    fn insert(&mut self, color: State, column: u8) -> Result<(), Box<dyn Error>>;
}
impl GridTrait for Grid {
    fn new() -> Self {
        [[State::None; 7]; 6]
    }
    fn insert(&mut self, color: State, column: u8) -> Result<(), Box<dyn Error>> {
        if column >= 7 {
            return Err("there is only 7 columns 0-6".into());
        }
        let mut i: i8 = 5;
        while i >= 0 {
            if self[i as usize][column as usize] == State::None {
                self[i as usize][column as usize] = color;
                return Ok(());
            }
            i -= 1;
        }
        Err("column full".into())
    }
}
impl fmt::Debug for State {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            State::None => write!(f, "⚫"),
            State::Yellow => write!(f, "🔵"),
            State::Red => write!(f, "🔴"),
        }
    }
}
