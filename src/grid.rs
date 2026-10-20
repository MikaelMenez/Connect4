use std::{error::Error, fmt};

const ROWS: usize = 6;
const COLS: usize = 7;

#[derive(Clone, Copy, PartialEq)]
pub enum Cell {
    Empty,
    Yellow,
    Red,
}

pub type Board = [[Cell; COLS]; ROWS];
impl Cell {
    fn oponent(self) -> Cell {
        match self {
            Cell::Yellow => Cell::Red,
            Cell::Red => Cell::Yellow,
            Cell::Empty => Cell::Empty,
        }
    }
}
pub trait BoardTrait {
    fn new() -> Self;
    fn drop(&mut self, color: Cell, column: usize) -> Option<usize>;
    fn check_win(&self, color: Cell) -> bool;
}
impl BoardTrait for Board {
    fn new() -> Self {
        [[Cell::Empty; COLS]; ROWS]
    }
    fn drop(&mut self, color: Cell, column: usize) -> Option<usize> {
        for row in 0..ROWS {
            if self[row][column] == Cell::Empty {
                self[row][column] = color;
                return Some(row);
            }
        }
        None
    }
    fn check_win(&self, color: Cell) -> bool {
        todo!()
    }
}
impl fmt::Debug for Cell {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Cell::Empty => write!(f, "⚫"),
            Cell::Yellow => write!(f, "🟡"),
            Cell::Red => write!(f, "🔴"),
        }
    }
}
