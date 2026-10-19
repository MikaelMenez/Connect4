use crate::grid::{Grid, GridTrait, State};

mod grid;
fn main() {
    let mut grid = Grid::new();
    println!("{grid:?}");
    grid.insert(State::Yellow, 0).unwrap();
    grid.insert(State::Yellow, 0).unwrap();
    grid.insert(State::Yellow, 0).unwrap();
    grid.insert(State::Yellow, 0).unwrap();
    grid.insert(State::Yellow, 0).unwrap();
    grid.insert(State::Yellow, 0).unwrap();
    println!("{}", grid.insert(State::Yellow, 0).unwrap_err());

    println!("{grid:?}");
}
